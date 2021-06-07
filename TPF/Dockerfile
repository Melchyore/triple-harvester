FROM node:4.2.2

# Install location
ENV dir /var/www/ldf-server

# Copy the server files
ADD . ${dir}

# Install the node module
RUN cd ${dir} && npm install

# Expose the default port
EXPOSE 3000
#EXPOSE 5000

# Run base binary
#WORKDIR ${dir}
#ENTRYPOINT ["node", "bin/ldf-server"]

# My edits
WORKDIR ${dir}
COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

# Default command
# CMD ["--help"]

