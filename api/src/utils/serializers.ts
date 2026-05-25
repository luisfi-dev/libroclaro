import { User, Institution, Book, Annotation, Invoice } from '@prisma/client';

export function serializeUser(user: User) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    birthDate: user.birthDate.toISOString().slice(0, 10),
    role: user.role,
    plan: user.plan,
    institutionId: user.institutionId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function serializeInstitution(inst: Institution) {
  return {
    id: inst.id,
    name: inst.name,
    adminId: inst.adminId,
    createdAt: inst.createdAt,
    updatedAt: inst.updatedAt,
  };
}

export function serializeBook(book: Book & { subject?: { name: string }; gradeLevel?: { name: string } }) {
  return {
    id: book.id,
    title: book.title,
    description: book.description,
    schoolYear: book.schoolYear,
    subjectId: book.subjectId,
    subject: book.subject?.name,
    gradeLevelId: book.gradeLevelId,
    gradeLevel: book.gradeLevel?.name,
    pageCount: book.pageCount,
    hidden: book.hidden,
    coverUrl: book.coverPath ? `/api/books/${book.id}/cover` : null,
    pdfUrl: `/api/books/${book.id}/pdf`,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
}

export function serializeAnnotation(a: Annotation) {
  return {
    id: a.id,
    bookId: a.bookId,
    page: a.page,
    kind: a.kind,
    x: a.x,
    y: a.y,
    width: a.width,
    height: a.height,
    content: a.content,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export function serializeInvoice(inv: Invoice) {
  return {
    id: inv.id,
    plan: inv.plan,
    amount: inv.amount.toString(),
    status: inv.status,
    periodStart: inv.periodStart,
    periodEnd: inv.periodEnd,
    paymentMethodLast4: inv.paymentMethodLast4,
    createdAt: inv.createdAt,
  };
}
