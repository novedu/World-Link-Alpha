import { http } from '../lib/http/client';

// 书籍服务
class BookService {
  // 获取世界下的书项目列表
  async getBooks(worldId: string) {
    return http.get('/books', { worldId });
  }

  // 创建书项目
  async createBook(worldId: string, title: string, description: string) {
    return http.post('/books', { worldId, title, description });
  }

  // 获取书项目详情
  async getBook(id: string) {
    return http.get(`/books/${id}`);
  }

  // 更新书项目
  async updateBook(id: string, updates: { title?: string; description?: string; status?: string }) {
    return http.put(`/books/${id}`, updates);
  }

  // 删除书项目
  async deleteBook(id: string) {
    return http.delete(`/books/${id}`);
  }

  // 获取书项目的实体列表
  async getBookEntities(id: string) {
    return http.get(`/books/${id}/entities`);
  }
}

export const bookService = new BookService();
