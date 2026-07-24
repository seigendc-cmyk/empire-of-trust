import type { Book } from '../types';

export function projectPublicBook(book: Book): Book {
  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    author: book.author,
    publisherId: book.publisherId,
    description: book.description,
    category: book.category,
    genre: book.genre,
    subGenre: book.subGenre,
    tags: (book.tags || []).slice(0, 20),
    targetAudience: book.targetAudience,
    language: book.language,
    price: book.price,
    currency: book.currency,
    coverFront: book.coverFront,
    coverBack: {
      synopsis: book.coverBack.synopsis,
      publisherName: book.coverBack.publisherName,
      bgColor: book.coverBack.bgColor,
      textColor: book.coverBack.textColor,
    },
    chapters: [],
    references: [],
    isPublished: true,
    publishedAt: new Date().toISOString(),
    createdAt: book.createdAt,
    updatedAt: new Date().toISOString(),
    version: book.version,
  };
}
