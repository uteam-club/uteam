/**
 * Генерирует массив страниц для пагинации с максимум 10 кнопками
 * @param currentPage - текущая страница
 * @param totalPages - общее количество страниц
 * @returns массив страниц с возможными многоточиями
 */
export function generatePaginationPages(currentPage: number, totalPages: number): (number | 'ellipsis1' | 'ellipsis2')[] {
  const pages: (number | 'ellipsis1' | 'ellipsis2')[] = [];
  
  // Если страниц меньше или равно 10, показываем все
  if (totalPages <= 10) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }
  
  // Если страниц больше 10, используем умную логику
  
  // Всегда показываем первую страницу
  pages.push(1);
  
  // Если текущая страница близко к началу (1-4)
  if (currentPage <= 4) {
    // Показываем страницы 2, 3, 4, 5
    for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
      pages.push(i);
    }
    
    if (totalPages > 6) {
      pages.push('ellipsis1');
    }
    
    // Показываем последнюю страницу
    pages.push(totalPages);
  }
  // Если текущая страница близко к концу (totalPages-3 до totalPages)
  else if (currentPage >= totalPages - 3) {
    if (totalPages > 6) {
      pages.push('ellipsis1');
    }
    
    // Показываем страницы totalPages-4, totalPages-3, totalPages-2, totalPages-1
    for (let i = Math.max(2, totalPages - 4); i < totalPages; i++) {
      pages.push(i);
    }
    
    // Показываем последнюю страницу
    pages.push(totalPages);
  }
  // Если текущая страница в середине
  else {
    if (currentPage > 5) {
      pages.push('ellipsis1');
    }
    
    // Показываем соседние страницы (текущая - 1, текущая, текущая + 1)
    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
      pages.push(i);
    }
    
    if (currentPage < totalPages - 4) {
      pages.push('ellipsis2');
    }
    
    // Показываем последнюю страницу
    pages.push(totalPages);
  }
  
  // Удаляем дубликаты и сортируем
  const uniquePages = [...new Set(pages)];
  const sortedPages = uniquePages.sort((a, b) => {
    if (a === 'ellipsis1') return -1;
    if (b === 'ellipsis1') return 1;
    if (a === 'ellipsis2') return 1;
    if (b === 'ellipsis2') return -1;
    return (a as number) - (b as number);
  });
  
  return sortedPages;
}

/**
 * Проверяет, является ли элемент многоточием
 * @param page - элемент страницы
 * @returns true, если это многоточие
 */
export function isEllipsis(page: number | 'ellipsis1' | 'ellipsis2'): page is 'ellipsis1' | 'ellipsis2' {
  return page === 'ellipsis1' || page === 'ellipsis2';
}
