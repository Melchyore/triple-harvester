FROM node:16
#FROM comunica/actor-init-sparql:latest

# Install location
ENV dir /app

# Copy the engine files (generated from package.json!files)
COPY . ${dir}

#COPY ./entrypoint.sh ${dir}/entrypoint.sh
WORKDIR ${dir}
#ENTRYPOINT ["bash",  "entrypoint.sh"]
ENTRYPOINT ["node",  "entrypoint.js"]

