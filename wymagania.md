Minimum 2 moduły lub klasy z jasno wyodrębnioną odpowiedzialnością (np. Storage, UI, Game, API). Użycie class z metodami lub ES Modules z import/export. Klasy mogą zawierać toJSON() / fromJSON() tam, gdzie dane są persystowane.
Kod podzielony na foldery (js/, css/, assets/ itp.). Brak monolitu w jednym pliku .js. Sensowne nazwy plików, klas i zmiennych. Brak zbędnego kodu i zakomentowanych fragmentów.
Operacje asynchroniczne z użyciem async/await lub Promises. Przy fetch: sprawdzanie response.ok, obsługa kodów HTTP. Promise.all do równoległego ładowania tam, gdzie sensowne. Programowanie funkcyjne: map/filter/reduce, pure functions, niemutowalne struktury.
Wszystkie zdarzenia DOM przez addEventListener lub element.onclick w JS (brak onclick="..." w HTML). Delegacja zdarzeń dla list generowanych dynamicznie (jeden handler na kontenerze, identyfikacja przez event.target / closest).
Tworzenie i modyfikacja elementów przez querySelector, createElement, textContent/innerHTML, classList, appendChild. Brak inline-stylów (style="" w atrybucie HTML). Czysty podział: HTML = struktura, CSS = wygląd, JS = zachowanie.
Sprawdzanie formularzy i inputów: puste pola, długości (min/max), formaty (liczby, email, daty, kolory itp.). Czytelne komunikaty błędów widoczne dla użytkownika (toast, alert DOM, pole błędu pod inputem) — nie tylko console.log.
try/catch przy operacjach asynchronicznych i potencjalnie ryzykownych. .catch() przy Promise. Widoczne komunikaty o błędach dla użytkownika. Aplikacja nie crashuje przy błędnym wejściu lub braku sieci.
Użycie Bootstrap lub Tailwind do stylowania (komponenty: przyciski, formularze, karty, modale). Aplikacja działa poprawnie na szerokości 360px i 1280px+. Spójna kolorystyka i typografia. Semantyczny HTML (header, main, section, article, nav).
Minimum 5 commitów rozłożonych w czasie — nie jeden 'final commit'. Sensowne opisy commitów. .gitignore zawiera node_modules/ i pliki systemowe (np. .DS_Store, Thumbs.db).
README zawiera: opis aplikacji i temat, instrukcję uruchomienia (jak otworzyć w przeglądarce lub uruchomić serwer), screenshoty kluczowych widoków, listę zrealizowanych wymagań z mapowaniem na próg oceny z PROJEKT.md.
Rejestracja i logowanie z walidacją formularza. Token JWT lub sesja przechowywana w localStorage. Hasła hashowane bcrypt. Endpointy chronione middleware auth.
Tworzenie, otwieranie, zapisywanie i usuwanie dokumentów Markdown. Lista dokumentów użytkownika. Persystencja w bazie (SQLite lub plikach JSON).
Wysyłanie i odbieranie operacji edycyjnych przez WebSocket (pakiet ws). Broadcast zmian do wszystkich użytkowników edytujących ten sam dokument. Strukturyzowane wiadomości JSON z polem type.
Implementacja prostego CRDT lub Operational Transformation do scalania równoległych zmian w dokumencie bez utraty danych.
Wysyłanie pozycji kursora i zaznaczeń do innych użytkowników, wizualizacja ich pozycji w edytorze.
Buforowanie zmian w localStorage lub IndexedDB podczas braku połączenia. Automatyczna synchronizacja po przywróceniu połączenia WebSocket (reconnect z exponential backoff).
Parsowanie Markdown w JS (bez zewnętrznych bibliotek lub z marked.js) i renderowanie podglądu HTML w elemencie div podczas pisania. Debounce 300ms.
Przechowywanie kolejnych wersji dokumentu w bazie. Możliwość cofania i ponawiania zmian. Lista wersji dostępna w panelu bocznym.
Elastyczny układ edytora i listy dokumentów. Lista użytkowników online w dokumencie (prezencja). Role admin/user — admin może usuwać cudze dokumenty.