FROM node:20-alpine

# تثبيت أدوات البناء
RUN apk add --no-cache python3 make g++

WORKDIR /app

# نسخ package.json فقط أولاً (هذا هو المفتاح!)
COPY package.json package-lock.json* ./

# تثبيت الاعتماديات داخل الحاوية (وليس من Windows)
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# إعادة بناء bcrypt (اختياري، ولكن للتأكيد)
RUN npm rebuild bcrypt --build-from-source

# نسخ باقي الكود
COPY . .

EXPOSE 4000

CMD ["node", "index.js"]

