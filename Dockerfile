FROM node:24-bullseye

WORKDIR /usr/src/app

# Ensure node user can write to workdir
RUN mkdir -p /usr/src/app && chown -R node:node /usr/src/app

USER node

EXPOSE 5173

# Default command - overridden by compose in dev
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
