FROM node:14 AS build-env

WORKDIR /app

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json

RUN npm ci

COPY . /app

###############

FROM gcr.io/distroless/nodejs:14 AS runner

COPY --from=build-env /app /app

WORKDIR /app

EXPOSE 3001

CMD ["index.js"]