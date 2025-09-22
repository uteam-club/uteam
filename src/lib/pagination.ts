// Утилиты для пагинации

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

import { NextRequest } from 'next/server';

// Парсинг параметров пагинации из URL
export function parsePaginationParams(request: NextRequest): PaginationParams {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

// Создание ответа с пагинацией
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / pagination.limit);
  
  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1
    }
  };
}

// Валидация параметров пагинации
export function validatePaginationParams(params: PaginationParams): PaginationParams {
  return {
    page: Math.max(1, params.page),
    limit: Math.min(100, Math.max(1, params.limit)),
    offset: Math.max(0, (Math.max(1, params.page) - 1) * Math.min(100, Math.max(1, params.limit)))
  };
}

// Генерация метаданных для пагинации
export function generatePaginationMeta(pagination: PaginationParams, total: number) {
  const totalPages = Math.ceil(total / pagination.limit);
  
  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages,
    hasNext: pagination.page < totalPages,
    hasPrev: pagination.page > 1,
    startItem: (pagination.page - 1) * pagination.limit + 1,
    endItem: Math.min(pagination.page * pagination.limit, total)
  };
}

// Генерация страниц для пагинации
export function generatePaginationPages(currentPage: number, totalPages: number, maxVisible: number = 5) {
  const pages: (number | string)[] = [];
  const halfVisible = Math.floor(maxVisible / 2);
  
  let startPage = Math.max(1, currentPage - halfVisible);
  let endPage = Math.min(totalPages, currentPage + halfVisible);
  
  // Adjust if we're near the beginning or end
  if (endPage - startPage + 1 < maxVisible) {
    if (startPage === 1) {
      endPage = Math.min(totalPages, startPage + maxVisible - 1);
    } else {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
  }
  
  // Add first page and ellipsis if needed
  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) {
      pages.push('...');
    }
  }
  
  // Add visible pages
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  // Add ellipsis and last page if needed
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push('...');
    }
    pages.push(totalPages);
  }
  
  return pages;
}

// Проверка, является ли элемент многоточием
export function isEllipsis(item: number | string): item is string {
  return item === '...';
}