# VentasClaras

Sistema de gestión de ventas, cotizaciones y facturación construido con Next.js y Firebase.

## 🚀 Características

- **Gestión de Clientes**: Administra información de clientes, direcciones y recordatorios
- **Productos e Inventario**: Control de productos con lotes, precios y stock
- **Cotizaciones**: Crea y gestiona cotizaciones para clientes
- **Facturación**: Genera facturas con seguimiento de pagos y estados
- **Reportes**: Análisis de ventas y métricas de negocio
- **Multi-moneda**: Soporte para DOP y USD

## 🏗️ Arquitectura

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 18 + Tailwind CSS + shadcn/ui
- **Estado**: React Hooks
- **Validación**: Zod
- **Autenticación**: Firebase Auth

### Backend
- **Runtime**: Firebase Functions (Node.js 20)
- **Base de datos**: Cloud Firestore
- **Arquitectura**: Controller-Service-Repository pattern
- **Validación**: Zod schemas

### Monitoreo
- **Error Tracking**: Sentry
- **Performance**: Firebase Performance Monitoring
- **Logging**: Structured logging con contexto

## 📁 Estructura del Proyecto

```
.
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   └── *.tsx           # Custom components
│   ├── lib/                # Utilities y configuración
│   │   ├── api/            # Firebase Functions API clients
│   │   ├── firebase/       # Firebase config
│   │   └── logger.ts       # Structured logger
│   └── hooks/              # Custom React hooks
│
├── functions/
│   └── src/
│       ├── controllers/    # HTTP request handlers
│       ├── services/       # Business logic
│       ├── repositories/   # Data access layer
│       ├── utils/          # Utilities (logger, etc.)
│       ├── schema.ts       # Zod validation schemas
│       └── types.ts        # TypeScript types
│
├── .github/
│   └── workflows/          # CI/CD pipelines
│
└── docs/                   # Documentation
```

## 🛠️ Instalación y Configuración

### Prerrequisitos

- Node.js 20 o superior
- npm o yarn
- Cuenta de Firebase
- Cuenta de Sentry (opcional, para monitoreo)

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd VentasClarasFireBaseStudio
   ```

2. **Instalar dependencias**
   ```bash
   # Frontend
   npm install --legacy-peer-deps

   # Firebase Functions
   cd functions
   npm install
   cd ..
   ```

3. **Configurar variables de entorno**
   
   Copia el template y configura tus variables:
   ```bash
   cp .env.development.template .env.local
   ```

   Edita `.env.local` con tus credenciales de Firebase:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

   # Sentry (opcional)
   NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
   SENTRY_DSN=your-sentry-dsn
   SENTRY_AUTH_TOKEN=your-auth-token
   SENTRY_PROJECT=your-project
   SENTRY_ORG=your-org
   ```

4. **Configurar Firebase Functions**
   
   En el directorio `functions`, crea un archivo `.env` con:
   ```env
   SENTRY_DSN=your-sentry-dsn
   ```

## 🧪 Testing

### Ejecutar Tests

```bash
# Tests del frontend
npm run test

# Tests en modo watch
npm run test:watch

# Tests con interfaz visual
npm run test:ui

# Tests con coverage
npm run test:coverage

# Tests de Firebase Functions
cd functions
npm run test
npm run test:coverage
```

### Cobertura de Tests

El proyecto tiene configurado un umbral mínimo de cobertura del 70% para:
- Líneas de código
- Funciones
- Branches
- Statements

## 🚀 Desarrollo

### Modo Desarrollo

```bash
# Iniciar Next.js dev server
npm run dev

# Iniciar Firebase emulators
firebase emulators:start
```

La aplicación estará disponible en `http://localhost:3000`

### Comandos Útiles

```bash
# Lint
npm run lint

# Type checking
npm run typecheck

# Build para producción
npm run build

# Iniciar servidor de producción
npm run start
```

# Build y deploy a Firebase
npm run build
firebase deploy
```

## 🔒 Seguridad

### Firestore Security Rules

Las reglas de seguridad están configuradas para:
- ✅ Requerir autenticación para todas las operaciones
- ✅ Bloquear escrituras directas desde el cliente
- ✅ Forzar uso de Cloud Functions para mutaciones

### Validación de Datos

- ✅ Validación en el cliente con Zod
- ✅ Validación en el servidor con Zod schemas
- ✅ Type safety con TypeScript strict mode

## 📊 Monitoreo

### Sentry

El proyecto está integrado con Sentry para:
- Error tracking en frontend y backend
- Performance monitoring
- Session replay
- User feedback

### Logs

Usa el logger estructurado para registrar eventos:

```typescript
import { logger } from '@/lib/logger'

// Frontend
logger.info('User logged in', { userId: user.id })
logger.error(error, { context: 'payment-processing' })

// Functions
import { logger } from './utils/logger'
logger.warn('Low stock detected', { productId, stock })
```

## 🤝 Contribuir

1. Crea un branch desde `develop`
2. Haz tus cambios
3. Asegúrate de que los tests pasen: `npm run test`
4. Asegúrate de que el lint pase: `npm run lint`
5. Crea un Pull Request

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para más detalles.

## 📝 Licencia

Este proyecto es privado y propietario.

## 🆘 Soporte

Para preguntas o problemas, contacta al equipo de desarrollo.

---

**Versión**: 0.1.0  
**Última actualización**: 2025-11-21
