import { render, screen } from '@testing-library/react';
import App from './App';

test('renders home page search placeholder', () => {
  render(<App />);
  const inputElement = screen.getByPlaceholderText(/киберсигурността/i);
  expect(inputElement).toBeInTheDocument();
});
