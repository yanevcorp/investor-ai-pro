import { render, screen } from '@testing-library/react';
import App from './App';

test('renders home page search placeholder', () => {
  render(<App />);
  const inputElement = screen.getByPlaceholderText(/Намери ми подценени/i);
  expect(inputElement).toBeInTheDocument();
});
