/**
 * shadcn / Magic UI 的注册表组件统一从 `@/lib/utils` 取 `cn`。
 * 项目里 `cn` 的实现一直在 `@/lib/cn`，这里只做转发，
 * 避免为了接入注册表组件而在两处维护同一份合并逻辑。
 */
export { cn } from './cn';
