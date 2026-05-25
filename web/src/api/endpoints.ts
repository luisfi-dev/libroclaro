import { api } from './client';
import type {
  AnnotationKind,
  AnnotationMeta,
  Book,
  GradeLevel,
  Institution,
  Invoice,
  Quota,
  Subject,
  SubscriptionPlan,
  SubscriptionStatus,
  SupplementaryMaterial,
  User,
} from '../types';

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/api/auth/login', { email, password }).then((r) => r.data),
  register: (data: {
    fullName: string;
    email: string;
    birthDate: string;
    password: string;
    passwordConfirmation: string;
  }) =>
    api.post<{ token: string; user: User }>('/api/auth/register', data).then((r) => r.data),
  me: () => api.get<{ user: User }>('/api/auth/me').then((r) => r.data.user),
  updateMe: (data: Partial<{ fullName: string; email: string; birthDate: string; password: string }>) =>
    api.patch<{ user: User }>('/api/auth/me', data).then((r) => r.data.user),
  deleteMe: () => api.delete('/api/auth/me'),
};

// Catalog
export const catalogApi = {
  listSubjects: () =>
    api.get<{ subjects: Subject[] }>('/api/catalog/subjects').then((r) => r.data.subjects),
  createSubject: (name: string) =>
    api.post<{ subject: Subject }>('/api/catalog/subjects', { name }).then((r) => r.data.subject),
  listGradeLevels: () =>
    api.get<{ gradeLevels: GradeLevel[] }>('/api/catalog/grade-levels').then((r) => r.data.gradeLevels),
  createGradeLevel: (name: string, order: number) =>
    api.post<{ gradeLevel: GradeLevel }>('/api/catalog/grade-levels', { name, order }).then((r) => r.data.gradeLevel),
};

// Books
export interface BookFilters {
  q?: string;
  subjectId?: string;
  gradeLevelId?: string;
  schoolYear?: string;
  includeHidden?: boolean;
}

export const booksApi = {
  list: (filters: BookFilters = {}) =>
    api.get<{ books: Book[] }>('/api/books', { params: filters }).then((r) => r.data.books),
  get: (id: string) => api.get<{ book: Book }>(`/api/books/${id}`).then((r) => r.data.book),
  create: (data: FormData) =>
    api.post<{ book: Book }>('/api/books', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.book),
  update: (id: string, data: Partial<Pick<Book, 'title' | 'description' | 'schoolYear' | 'subjectId' | 'gradeLevelId' | 'hidden'>>) =>
    api.patch<{ book: Book }>(`/api/books/${id}`, data).then((r) => r.data.book),
  remove: (id: string) => api.delete(`/api/books/${id}`),
  coverUrl: (id: string) => `${api.defaults.baseURL ?? ''}/api/books/${id}/cover`,
  pdfUrl: (id: string, annotated = false) =>
    `${api.defaults.baseURL ?? ''}/api/books/${id}/pdf${annotated ? '?annotated=true' : ''}`,
};

// Annotations
export const annotationsApi = {
  listForBook: (bookId: string, page?: number) =>
    api
      .get<{ annotations: AnnotationMeta[]; quota: Quota }>(
        `/api/books/${bookId}/annotations`,
        { params: page ? { page } : undefined },
      )
      .then((r) => r.data),
  reveal: (id: string) =>
    api.get<{ annotation: AnnotationMeta; quota: Quota }>(`/api/annotations/${id}/reveal`).then((r) => r.data),
  create: (bookId: string, data: {
    page: number;
    kind: AnnotationKind;
    x: number;
    y: number;
    width: number;
    height: number;
    content: string;
  }) => api.post<{ annotation: AnnotationMeta }>(`/api/books/${bookId}/annotations`, data).then((r) => r.data.annotation),
  update: (id: string, data: Partial<{
    page: number;
    kind: AnnotationKind;
    x: number;
    y: number;
    width: number;
    height: number;
    content: string;
  }>) => api.patch<{ annotation: AnnotationMeta }>(`/api/annotations/${id}`, data).then((r) => r.data.annotation),
  remove: (id: string) => api.delete(`/api/annotations/${id}`),
};

// Materials
export const materialsApi = {
  listForBook: (bookId: string, page?: number) =>
    api
      .get<{ materials: SupplementaryMaterial[] }>(
        `/api/books/${bookId}/materials`,
        { params: page ? { page } : undefined },
      )
      .then((r) => r.data.materials),
  get: (id: string) =>
    api.get<{ material: SupplementaryMaterial }>(`/api/materials/${id}`).then((r) => r.data.material),
  create: (bookId: string, data: { fromPage: number; toPage: number; title: string; content: string }) =>
    api.post<{ material: SupplementaryMaterial }>(`/api/books/${bookId}/materials`, data).then((r) => r.data.material),
  update: (id: string, data: Partial<{ fromPage: number; toPage: number; title: string; content: string }>) =>
    api.patch<{ material: SupplementaryMaterial }>(`/api/materials/${id}`, data).then((r) => r.data.material),
  remove: (id: string) => api.delete(`/api/materials/${id}`),
};

// Institutions
export const institutionsApi = {
  getMine: () =>
    api.get<{ institution: Institution }>('/api/institutions/me').then((r) => r.data.institution),
  updateMine: (name: string) =>
    api.patch<{ institution: Institution }>('/api/institutions/me', { name }).then((r) => r.data.institution),
  listMembers: () =>
    api.get<{ members: User[] }>('/api/institutions/me/members').then((r) => r.data.members),
  createMember: (data: { fullName: string; email: string; birthDate: string; password: string }) =>
    api.post<{ user: User }>('/api/institutions/me/members', data).then((r) => r.data.user),
  addExisting: (email: string) =>
    api.post<{ user: User }>('/api/institutions/me/members/existing', { email }).then((r) => r.data.user),
  updateMember: (id: string, data: Partial<{ fullName: string; email: string; birthDate: string; password: string }>) =>
    api.patch<{ user: User }>(`/api/institutions/me/members/${id}`, data).then((r) => r.data.user),
  removeMember: (id: string) => api.delete(`/api/institutions/me/members/${id}`),
};

// Subscriptions
export interface SubscribePayload {
  plan: SubscriptionPlan;
  institutionName?: string;
  cardNumber?: string;
  cardHolder?: string;
  cardExpiry?: string;
  cardCvc?: string;
}

export const subscriptionsApi = {
  status: () => api.get<SubscriptionStatus>('/api/subscriptions/status').then((r) => r.data),
  subscribe: (data: SubscribePayload) =>
    api
      .post<{ user: User; institution: Institution | null; invoice: Invoice | null }>(
        '/api/subscriptions/subscribe',
        data,
      )
      .then((r) => r.data),
  invoices: () =>
    api.get<{ invoices: Invoice[] }>('/api/subscriptions/invoices').then((r) => r.data.invoices),
};

// Editors
export const editorsApi = {
  createEditor: (data: { fullName: string; email: string; birthDate: string; password: string }) =>
    api.post<{ user: User }>('/api/editors', data).then((r) => r.data.user),
  promote: (email: string) =>
    api.post<{ user: User }>('/api/editors/promote', { email }).then((r) => r.data.user),
};
