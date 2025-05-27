import useSWR from 'swr';
import queryString from 'query-string';
import React from 'react';

// Оптимизированный fetcher с кешированием и обработкой ошибок
const fetcher = async (url: string) => {
  try {
    // Добавляем кеш-бастинг для избежания проблем с кешем браузера
    const fetchUrl = url.includes('?') ? `${url}&_=${Date.now()}` : `${url}?_=${Date.now()}`;
    
    const res = await fetch(fetchUrl, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!res.ok) {
      throw new Error(`Ошибка запроса: ${res.status}`);
    }
    
    return res.json();
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    throw error;
  }
};

// Ключи для SWR кеша
const CACHE_KEYS = {
  EXERCISES: '/api/exercises',
  USERS: '/api/users',
  CATEGORIES: '/api/exercise-categories',
  TAGS: '/api/exercise-tags',
};

export function useExercises() {
  const { data, error, isLoading, mutate } = useSWR(CACHE_KEYS.EXERCISES, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // Уменьшаем до 30 секунд
    errorRetryCount: 3,
    suspense: false,
  });

  return {
    exercises: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

// Тип для параметров фильтрации
export interface FilterParams {
  search?: string;
  authorId?: string;
  categoryId?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export function useFilteredExercises(params: FilterParams = {}) {
  // Мемоизация URL с параметрами фильтрации для стабильности ключа кеша
  const filterUrl = React.useMemo(() => {
    // Формируем объект параметров
    const queryParams: Record<string, any> = {};
    
    if (params.search) queryParams.search = params.search;
    if (params.authorId) queryParams.authorId = params.authorId;
    if (params.categoryId) queryParams.categoryId = params.categoryId;
    
    // Добавляем теги как массив
    if (params.tags && params.tags.length > 0) {
      queryParams.tags = params.tags;
    }
    
    // Параметры пагинации (по умолчанию 12 элементов на страницу)
    if (params.page) queryParams.page = params.page;
    queryParams.limit = params.limit || 12;
    
    // Формируем URL с параметрами
    return queryString.stringifyUrl({
      url: '/api/exercises/filter',
      query: queryParams,
    });
  }, [
    params.search,
    params.authorId,
    params.categoryId,
    params.tags ? params.tags.join(',') : '',
    params.page,
    params.limit
  ]);
  
  // Используем SWR для запроса с фильтрами с оптимизированными настройками
  const { data, error, isLoading, mutate } = useSWR(
    filterUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 15000, // Уменьшаем до 15 секунд для более частого обновления
      errorRetryCount: 2,
      keepPreviousData: true, // Сохраняем предыдущие данные при изменении запроса
      suspense: false,
      revalidateOnReconnect: true,
      focusThrottleInterval: 10000, // Ограничиваем ревалидацию при фокусе
    }
  );

  // Дефолтные значения для пагинации и пустого массива упражнений
  const defaultPagination = {
    page: params.page || 1,
    limit: params.limit || 12, // Изменяем дефолтный лимит на 12
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  };

  return {
    exercises: data?.exercises || [],
    pagination: data?.pagination || defaultPagination,
    isLoading,
    isError: error,
    mutate,
  };
}

// Хук для получения пользователей с кешированием и стабильным ключом
export function useUsers() {
  const { data, error, isLoading } = useSWR(CACHE_KEYS.USERS, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 минут - данные пользователей меняются редко
    errorRetryCount: 2,
    suspense: false,
  });

  return {
    users: data || [],
    isLoading,
    isError: error,
  };
}

// Хук для получения категорий с кешированием и стабильным ключом
export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR(CACHE_KEYS.CATEGORIES, async (url) => {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Ошибка при загрузке категорий:', error);
      throw error;
    }
  }, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 минут - данные категорий меняются редко
    errorRetryCount: 2,
    suspense: false,
    shouldRetryOnError: true,
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      // Повторяем запрос только 2 раза
      if (retryCount >= 2) return;
      
      // Повторяем через увеличивающийся интервал
      setTimeout(() => revalidate({ retryCount }), Math.min(1000 * 2 ** retryCount, 30000));
    }
  });

  return {
    categories: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

// Функция для получения тегов с учетом поддомена
async function fetchTags(url: string) {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка при загрузке тегов:', error);
    throw error;
  }
}

// Хук для получения тегов с кешированием и стабильным ключом
export function useTags() {
  const { data, error, isLoading, mutate } = useSWR(CACHE_KEYS.TAGS, fetchTags, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // Уменьшаем до 30 секунд для более частого обновления
    errorRetryCount: 3,
    suspense: false,
    shouldRetryOnError: true,
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      // Повторяем запрос только 3 раза
      if (retryCount >= 3) return;
      
      // Повторяем через увеличивающийся интервал
      setTimeout(() => revalidate({ retryCount }), Math.min(1000 * 2 ** retryCount, 30000));
    }
  });

  return {
    tags: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useClub(clubId: string) {
  const { data, error, isLoading } = useSWR(
    clubId ? `/api/clubs/${clubId}` : null, 
    fetcher, 
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 минут
      errorRetryCount: 2,
      suspense: false,
    }
  );

  return {
    club: data,
    isLoading,
    isError: error,
  };
}

// Хук для получения категорий тренировок
export function useTrainingCategories() {
  const { data, error, isLoading, mutate } = useSWR('/api/training-categories', async (url) => {
    try {
      console.log('Fetching training categories...');
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response from server:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Training categories fetched successfully:', data.length);
      return data;
    } catch (error) {
      console.error('Error fetching training categories:', error);
      throw error;
    }
  }, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 минут
    errorRetryCount: 2,
    suspense: false,
    shouldRetryOnError: true,
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      // Повторяем запрос только 2 раза
      if (retryCount >= 2) {
        console.log('Max retry count reached, stopping retries');
        return;
      }
      
      // Повторяем через увеличивающийся интервал
      const delay = Math.min(1000 * 2 ** retryCount, 30000);
      console.log(`Retrying in ${delay}ms (attempt ${retryCount + 1})`);
      setTimeout(() => revalidate({ retryCount }), delay);
    }
  });

  return {
    categories: data || [],
    isLoading,
    isError: error,
    error: error ? error.message : null,
    mutate,
  };
} 