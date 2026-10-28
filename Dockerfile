# Imagen de producción del sitio de Bacano Media.
#
# Se apoya en la salida `standalone` de Next: el build deja en
# .next/standalone un server.js con solo las dependencias que el sitio usa
# de verdad, así la imagen final no carga node_modules entero.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- Dependencias -----------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Pruebas de reglas y PostgreSQL sobre una base efímera.
FROM deps AS pruebas
COPY . .
CMD ["sh", "-c", "npm run test:estudio && npm run test:pagos:integration"]

# --- Build ------------------------------------------------------------------
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next/font descarga las tipografías acá y las deja auto-hospedadas,
# así que este paso necesita red.
RUN npm run build

# --- Runtime ----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs \
 && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
