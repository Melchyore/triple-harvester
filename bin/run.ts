#!/usr/bin/env node

import { readFile } from 'fs/promises'
import * as http from 'http'

import { ActorInitSparql } from '@comunica/actor-init-sparql'
import { IActorQueryOperationOutputBindings } from '@comunica/bus-query-operation'
import * as Setup from '@comunica/runner'
import type { Bindings } from '@comunica/types'

import { MyActionObserverRdfDereference } from '..'

function isValidHttpUrl (endpoint: string) {
  let url = null

  try {
    url = new URL(endpoint)
  } catch (_) {
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

  const args = process.argv
  const endpoint = args[2]
  const queryFilePath = args[3]

  if (endpoint && queryFilePath) {
    if (isValidHttpUrl(endpoint)) {
      try {
        const query = await readFile(queryFilePath)
        const result = await engine.query(
          query.toString(),
          { sources: [endpoint] }
        ) as IActorQueryOperationOutputBindings

        let body = ''
        let counter = 0

        setTimeout(() => {
          result.bindingsStream.on('data', (data: Bindings) => {
            body += `<${data.get('?s').value}> <${data.get('?p').value}> <${data.get('?o').value}>.\n`

            ++counter

            console.log(`Harvesting ${counter} triple${counter > 1 ? 's' : ''}`)
          })

          result.bindingsStream.on('end', () => {
            console.log('All triples have been harvested. Pushing to the server...')

            const options = {
              hostname: 'fairdata.systems',
              port: 8890,
              path: '/DAV/home/LDP/Hackathon/',
              method: 'POST',
              headers: {
                'Content-Type': 'application/n-triples',
                'Content-Length': Buffer.byteLength(body),
                Authorization: `Basic ${Buffer.from('ldp:ldp').toString('base64')}`,
                Accept: 'text/turtle',
                Slug: 'OBM'
              }
            }

            // We push the triples to the server.
            const request = http.request(options, response => {
              const statusCode = response.statusCode

              if (statusCode >= 200 && statusCode < 300) {
                console.log('Triples pushed successfully to the server.')
              } else {
                throw new Error('Could not push triples to the server.')
              }
            })

            request.on('error', error => {
              console.error(error)
            })

            request.write(body)
            request.end()
          })
        }, 100)
      } catch {
        throw new Error(`Could not open file: ${queryFilePath}`)
      }
    } else {
      throw new Error('The endpoint is not a valid URI.')
    }
  }
})()
