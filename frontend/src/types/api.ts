/**
 * @deprecated This file is deprecated. Please use individual type files instead:
 * - import { ApiResponse, PaginatedResponse } from '@/types/common'
 * - import { User, AuthResponse, LoginDto, RegisterDto } from '@/types/auth'
 * - import { Item, CreateItemDto, UpdateItemDto, GetItemsQuery } from '@/types/item'
 * 
 * Or simply: import { ... } from '@/types'
 */

// Re-export all types for backward compatibility
export * from './common';
export * from './auth';
export * from './item';
