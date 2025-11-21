# Guía de Contribución

¡Gracias por tu interés en contribuir a VentasClaras! Esta guía te ayudará a mantener la calidad y consistencia del código.

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Proceso de Contribución](#proceso-de-contribución)
- [Estándares de Código](#estándares-de-código)
- [Convenciones de Commits](#convenciones-de-commits)
- [Testing](#testing)
- [Pull Requests](#pull-requests)

## 🤝 Código de Conducta

- Sé respetuoso y profesional
- Acepta críticas constructivas
- Enfócate en lo mejor para el proyecto

## 🔄 Proceso de Contribución

### 1. Configurar el Entorno

```bash
# Clonar el repositorio
git clone <repository-url>
cd VentasClarasFireBaseStudio

# Instalar dependencias
npm install --legacy-peer-deps
cd functions && npm install && cd ..

# Configurar variables de entorno
cp .env.development.template .env.local
# Editar .env.local con tus credenciales
```

### 2. Crear un Branch

```bash
# Actualizar develop
git checkout develop
git pull origin develop

# Crear feature branch
git checkout -b feature/nombre-descriptivo

# O para bugfixes
git checkout -b fix/descripcion-del-bug
```

### 3. Hacer Cambios

- Escribe código limpio y legible
- Sigue los estándares de código (ver abajo)
- Agrega tests para nuevas funcionalidades
- Actualiza documentación si es necesario

### 4. Verificar Calidad

```bash
# Lint
npm run lint

# Type check
npm run typecheck

# Tests
npm run test

# Build
npm run build
```

## 💻 Estándares de Código

### TypeScript

- **Strict Mode**: Siempre habilitado
- **No `any`**: Usa tipos específicos
- **Interfaces sobre Types**: Para objetos
- **Nomenclatura**:
  - Variables/funciones: `camelCase`
  - Componentes/Clases: `PascalCase`
  - Constantes: `UPPER_SNAKE_CASE`
  - Archivos: `kebab-case.tsx`

### React/Next.js

```typescript
// ✅ Bueno
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface UserProfileProps {
  userId: string
  onUpdate: (data: UserData) => void
}

export function UserProfile({ userId, onUpdate }: UserProfileProps) {
  const [loading, setLoading] = useState(false)
  
  // ... implementation
}

// ❌ Malo
export default function UserProfile(props: any) {
  // Sin tipos, sin destructuring
}
```

### Firebase Functions

```typescript
// ✅ Bueno - Controller
export const createQuote = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in")
  }
  
  try {
    const data = createQuoteSchema.parse(request.data)
    return await quoteService.createQuote(data, request.auth.uid)
  } catch (error: any) {
    if (error.issues) {
      throw new HttpsError("invalid-argument", "Validation error", error.issues)
    }
    throw error
  }
})

// ✅ Bueno - Service
export const quoteService = {
  async createQuote(data: CreateQuoteData, userId: string): Promise<string> {
    // Validar
    // Procesar
    // Persistir
    return quoteId
  }
}
```

### Logging

```typescript
// ✅ Usar logger estructurado
import { logger } from '@/lib/logger'

logger.info('Quote created', { quoteId, userId })
logger.error(error, { context: 'quote-creation', quoteId })

// ❌ No usar console.log en producción
console.log('Quote created:', quoteId) // ❌
```

### Error Handling

```typescript
// ✅ Bueno
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  logger.error(error as Error, { context: 'operation-name' })
  throw new HttpsError('internal', 'Operation failed')
}

// ❌ Malo
try {
  return await riskyOperation()
} catch (e) {
  console.log(e) // ❌ No logging
  throw e // ❌ Error sin contexto
}
```

## 📝 Convenciones de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Formato, punto y coma, etc (no afecta código)
- `refactor`: Refactorización de código
- `test`: Agregar o modificar tests
- `chore`: Mantenimiento, dependencias, etc

### Ejemplos

```bash
# Feature
git commit -m "feat(quotes): add export to PDF functionality"

# Bug fix
git commit -m "fix(invoices): correct tax calculation for USD"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Refactor
git commit -m "refactor(services): extract common validation logic"

# Tests
git commit -m "test(quotes): add tests for quote conversion"
```

## 🧪 Testing

### Escribir Tests

```typescript
// quoteService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { quoteService } from '../quoteService'

describe('QuoteService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createQuote', () => {
    it('should create quote with auto-generated number', async () => {
      // Arrange
      const mockData = { /* ... */ }
      
      // Act
      const result = await quoteService.createQuote(mockData, 'user-123')
      
      // Assert
      expect(result).toBeDefined()
      expect(mockRepository.create).toHaveBeenCalled()
    })
  })
})
```

### Coverage Mínimo

- **Servicios**: 80%
- **Repositorios**: 70%
- **Controllers**: 60%

### Ejecutar Tests

```bash
# Todos los tests
npm run test

# Watch mode
npm run test:watch

# Con coverage
npm run test:coverage
```

## 🔍 Pull Requests

### Checklist

Antes de crear un PR, verifica:

- [ ] El código pasa lint: `npm run lint`
- [ ] El código pasa type check: `npm run typecheck`
- [ ] Todos los tests pasan: `npm run test`
- [ ] El build funciona: `npm run build`
- [ ] Agregaste tests para nuevas funcionalidades
- [ ] Actualizaste documentación si es necesario
- [ ] Los commits siguen convenciones
- [ ] El PR tiene una descripción clara

### Template de PR

```markdown
## Descripción
Breve descripción de los cambios

## Tipo de Cambio
- [ ] Bug fix
- [ ] Nueva funcionalidad
- [ ] Breaking change
- [ ] Documentación

## Testing
Describe cómo probaste los cambios

## Screenshots (si aplica)
Agrega screenshots para cambios de UI

## Checklist
- [ ] Lint pasa
- [ ] Tests pasan
- [ ] Build funciona
- [ ] Documentación actualizada
```

### Proceso de Review

1. Crea el PR desde tu branch a `develop`
2. Asigna reviewers
3. Espera aprobación (mínimo 1 reviewer)
4. Resuelve comentarios
5. Merge cuando esté aprobado

## 🎯 Mejores Prácticas

### DRY (Don't Repeat Yourself)

```typescript
// ✅ Bueno - Extraer lógica común
const formatCurrency = (amount: number, currency: 'DOP' | 'USD') => {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency,
  }).format(amount)
}

// Usar en múltiples lugares
const price1 = formatCurrency(100, 'DOP')
const price2 = formatCurrency(50, 'USD')
```

### Single Responsibility

```typescript
// ✅ Bueno - Una responsabilidad por función
async function createQuote(data: QuoteData) {
  const quoteId = generateId()
  const quoteNumber = await getNextQuoteNumber()
  const quote = buildQuote(data, quoteId, quoteNumber)
  await saveQuote(quote)
  return quoteId
}

// ❌ Malo - Hace demasiado
async function createQuote(data: any) {
  // Genera ID
  // Valida datos
  // Calcula totales
  // Guarda en DB
  // Envía email
  // Actualiza cache
  // etc...
}
```

### Composition over Inheritance

```typescript
// ✅ Bueno - Usar hooks y composition
function useQuoteActions() {
  const create = async (data: QuoteData) => { /* ... */ }
  const update = async (id: string, data: Partial<QuoteData>) => { /* ... */ }
  const remove = async (id: string) => { /* ... */ }
  
  return { create, update, remove }
}

function QuotePage() {
  const { create, update, remove } = useQuoteActions()
  // ...
}
```

## ❓ Preguntas

Si tienes preguntas sobre cómo contribuir, contacta al equipo de desarrollo.

---

¡Gracias por contribuir a VentasClaras! 🎉
