import { SupplementaryMaterial, serializeMaterial } from '../../src/models/SupplementaryMaterial';

/**
 * Prueba del modelo Mongoose contra el Mongo de docker (la conexión la abre
 * setupAfterEnv.ts). Valida el schema, el serializer y consultas por rango.
 */
describe('Modelo SupplementaryMaterial', () => {
  it('rechaza un documento sin los campos requeridos', async () => {
    const doc = new SupplementaryMaterial({ title: 'Solo título' });
    await expect(doc.validate()).rejects.toBeDefined();
  });

  it('persiste y serializa un documento válido', async () => {
    const doc = await SupplementaryMaterial.create({
      bookId: 'book-1',
      authorId: 'author-1',
      fromPage: 1,
      toPage: 4,
      title: 'Lectura',
      content: 'Contenido **markdown**',
    });
    const serialized = serializeMaterial(doc);
    expect(serialized.id).toBe(doc._id.toString());
    expect(serialized.title).toBe('Lectura');
    expect(serialized.content).toBe('Contenido **markdown**');
    // El serializer no expone authorId
    expect((serialized as Record<string, unknown>).authorId).toBeUndefined();
  });

  it('consulta por bookId y rango de páginas (fromPage ≤ p ≤ toPage)', async () => {
    await SupplementaryMaterial.create([
      { bookId: 'b', authorId: 'a', fromPage: 1, toPage: 3, title: 'En rango', content: 'x' },
      { bookId: 'b', authorId: 'a', fromPage: 8, toPage: 9, title: 'Fuera', content: 'y' },
    ]);
    const found = await SupplementaryMaterial.find({
      bookId: 'b',
      fromPage: { $lte: 2 },
      toPage: { $gte: 2 },
    });
    expect(found).toHaveLength(1);
    expect(found[0].title).toBe('En rango');
  });

  it('respeta el mínimo de página (min: 1)', async () => {
    const doc = new SupplementaryMaterial({
      bookId: 'b',
      authorId: 'a',
      fromPage: 0,
      toPage: 1,
      title: 't',
      content: 'c',
    });
    await expect(doc.validate()).rejects.toBeDefined();
  });
});
