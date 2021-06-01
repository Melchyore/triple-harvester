#!/usr/bin/env node

import { readFile } from 'fs/promises'
import * as http from 'http'

import { ActorInitSparql } from '@comunica/actor-init-sparql'
import { IActorQueryOperationOutputBindings } from '@comunica/bus-query-operation'
import * as Setup from '@comunica/runner'
import type { Bindings } from '@comunica/types'
import { Parser, Generator, SparqlQuery } from 'sparqljs'

import { MyActionObserverRdfDereference } from '..'

type RequestOptions = {
  hostname: string,
  port?: number,
  path: string,
  method: string,
  headers: {
    'Content-Type': string,
    'Content-Length': number,
    Authorization: string,
    Accept: string,
    Slug?: string
  }
}

type QueryTriple = {
  subject: {
    termType: string,
    value: string
  },
  predicate: {
    termType: string,
    value: string
  },
  object: {
    termType: string,
    value: string
  },
}

type QueryCondition = {
  type: string,
  triples: Array<QueryTriple>
}

type SparqlQueryObject = SparqlQuery & {
  variables: Array<unknown>,
  where: Array<QueryCondition>
}

function isValidHttpUrl (endpoint: string) {
  let url = null

  try {
    url = new URL(endpoint)
  } catch {
    return false
  }

  return url.protocol === "http:" || url.protocol === "https:"
}

(async function() {
  const runner = await Setup.instantiateComponent(
    __dirname + '/../config/config-default.json',
    'urn:comunica:my',
    { mainModulePath: __dirname + '/../' }
  )

  const { engine, observer }: { engine: ActorInitSparql, observer: MyActionObserverRdfDereference } = runner.collectActors({
    engine: 'urn:comunica:sparqlinit',
    observer: 'urn:observer:my',
  })

  const sourceEndpoint = process.env.ENDPOINT_SOURCE
  const targetEndpoint = process.env.ENDPOINT_TARGET
  const credentials = process.env.CREDENTIALS
  const queryFilePath = process.env.QUERY_FILE_PATH
  const slug = process.env.SLUG

  console.log(`
    USING ENV VARIABLES:\n
    ENDPOINT_SOURCE: ${sourceEndpoint}\n
    ENDPOINT_TARGET: ${targetEndpoint}\n
    CREDENTIALS: ${credentials}\n
    QUERY_FILE_PATH: ${queryFilePath}\n
    SLUG: ${slug}
  `)

  if (sourceEndpoint && targetEndpoint && queryFilePath) {
    if (isValidHttpUrl(sourceEndpoint) && isValidHttpUrl(targetEndpoint)) {
      try {
        const query = await readFile(queryFilePath)
        const SparqlParser = new Parser()
        const parsedQuery = SparqlParser.parse(query.toString()) as SparqlQueryObject

        let found = false

        // We check if the query has the variables ?p and ?o.
        for (const condition of parsedQuery.where) {
          for (const triple of condition.triples) {
            if (triple.subject.value === 's' && triple.predicate.value === 'p' && triple.object.value === 'o') {
              found = true

              break
            }
          }
        }

        if (!found) {
          parsedQuery.where.push({
            type: 'bgp',
            triples: [
              {
                subject: {
                  termType: 'Variable',
                  value: "s"
                },
                predicate: {
                  termType: 'Variable',
                  value: "p"
                },
                'object': {
                  termType: 'Variable',
                  value: "o"
                }
              }
            ]
          })
        }

        const SparqlGenerator = new Generator()

        try {
          const result = await engine.query(
            SparqlGenerator.stringify(parsedQuery),
            { sources: [sourceEndpoint] }
          ) as IActorQueryOperationOutputBindings

          let body = ''
          let counter = 0

          setTimeout(() => {
            result.bindingsStream.on('data', (data: Bindings) => {
              ++counter

              const object = data.get('?o')?.value

              body += `<${data.get('?s')?.value}> <${data.get('?p')?.value}> `

              if (isValidHttpUrl(object)) {
                body += `<${object}>`
              } else {
                body += `"${object}"`
              }

              body += '\n'

              process.stdout.write('\x1b[H\x1b[2J')
              console.log(`Harvesting ${counter} triple${counter > 1 ? 's' : ''}`)
            })

            result.bindingsStream.on('end', () => {
              console.log('All triples have been harvested. Pushing to the server...')

              const { hostname, port, pathname } = new URL(targetEndpoint)
              const options: RequestOptions = {
                hostname,
                path: pathname,
                method: 'POST',
                headers: {
                  'Content-Type': 'application/n-triples',
                  'Content-Length': Buffer.byteLength(body),
                  Authorization: `Basic ${Buffer.from(credentials).toString('base64')}`,
                  Accept: 'text/turtle',
                }
              }

              if (port) {
                options.port = parseInt(port)
              }

              if (slug) {
                options.headers.Slug = slug
              }

              // We push the triples to the server.
              const request = http.request(options, response => {
                const statusCode = response.statusCode

                if (statusCode >= 200 && statusCode < 300) {
                  console.log(`Triples pushed successfully to the target endpoint ${targetEndpoint}`)
                } else {
                  throw new Error(`Could not push triples to the target endpoint ${targetEndpoint}`)
                }
              })

              request.on('error', error => {
                console.error(error)
              })

              request.write(body)
              request.end()
            })
          }, 100)
        } catch (e) {
          throw new Error (`Could not harvest triples from source endpoint ${sourceEndpoint}\n${e}`)
        }
      } catch (e) {
        throw new Error(e)
      }
    } else {
      throw new Error('One or both of the endpoints is/are not valid.')
    }
  }
})()
