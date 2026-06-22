import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarkdownEditor } from './MarkdownEditor';

function ControlledEditor() {
  const [value, setValue] = useState('');
  return <MarkdownEditor value={value} onChange={setValue} />;
}

describe('MarkdownEditor', () => {
  it('refleja el texto escrito a través de onChange (flujo controlado)', async () => {
    render(<ControlledEditor />);
    const textbox = screen.getByRole('textbox');
    await userEvent.type(textbox, 'Hola');
    expect(textbox).toHaveValue('Hola');
  });

  it('muestra la vista previa cuando hay contenido', () => {
    render(<MarkdownEditor value="**negrita**" onChange={jest.fn()} />);
    expect(screen.getByText('Vista previa:')).toBeInTheDocument();
  });

  it('no muestra la vista previa cuando el valor está vacío', () => {
    render(<MarkdownEditor value="" onChange={jest.fn()} />);
    expect(screen.queryByText('Vista previa:')).not.toBeInTheDocument();
  });

  it('usa la etiqueta proporcionada', () => {
    render(<MarkdownEditor value="" onChange={jest.fn()} label="Corrección" />);
    expect(screen.getByLabelText('Corrección')).toBeInTheDocument();
  });
});
