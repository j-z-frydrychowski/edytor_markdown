# Edytor Markdown

To jest serwerowa aplikacja webowa do zespołowej edycji plików Markdown w czasie rzeczywistym. Narzędzie rozwiązuje problem konfliktów zapisu podczas jednoczesnej pracy wielu osób.

## Główne funkcje
* Algorytm synchronizacji: Aplikacja oblicza dokładne różnice w tekście i wysyła tylko zmodyfikowane fragmenty. Zapobiega to nadpisywaniu pracy innych osób.
* Praca bez sieci: Skrypt wykrywa brak połączenia z serwerem. Przeglądarka zapisuje zmiany w pamięci lokalnej. Odzyskanie sieci powoduje automatyczne wysłanie zaległych poprawek.
* Wskaźniki obecności: Ekran wyświetla listę aktywnych użytkowników oraz dokładną pozycję ich kursora.
* Zarządzanie dostępem: System weryfikuje użytkowników za pomocą tokenów JWT. Twórca dokumentu może go usunąć lub udostępnić wpisując nazwę konta współpracownika.
* Natywny eksport: Pobierasz gotowy dokument na swój dysk jako plik z rozszerzeniem md lub html.
* Podgląd na żywo: Skrypt renderuje formatowanie Markdown na bieżąco obok okna edytora.

## Technologie
* Serwer: Node.js oraz framework Express.
* Komunikacja: Protokół WebSocket zapewnia dwukierunkową wymianę wiadomości bez opóźnień.
* Interfejs: Czysty język JavaScript, HTML5 oraz CSS3. Biblioteka Bootstrap formatuje wygląd elementów.
* Baza danych: Pliki w formacie JSON przechowują informacje o użytkownikach i treściach dokumentów.

## Instalacja i uruchomienie
Wykonaj te kroki na swoim komputerze, aby poprawnie uruchomić projekt.

1. Sklonuj repozytorium na swój dysk.
2. Otwórz terminal w głównym katalogu projektu.
3. Wpisz polecenie npm install. Pobierze ono niezbędne pakiety zdefiniowane w pliku konfiguracyjnym.
4. Wpisz polecenie npm run dev. Uruchomi ono serwer.
5. Otwórz przeglądarkę i wpisz adres http://localhost:3000.

## Bezpieczeństwo
Aplikacja szyfruje hasła przed zapisem do bazy przy użyciu biblioteki bcrypt. Żadne punkty końcowe API nie zwracają otwartego tekstu hasła.
Każde zapytanie do serwera wymaga autoryzacji w nagłówku HTTP. Funkcja pośrednicząca odrzuca ruch bez poprawnego tokenu. Chroni to twoje pliki przed nieautoryzowanym pobraniem.

## Architektura wymiany danych
Mechanizm edycji omija przesyłanie całego tekstu przy każdym uderzeniu w klawisz. Funkcja obliczająca pobiera pozycję kursora, usunięte znaki oraz dodany ciąg tekstu. Serwer rozsyła ten mały ładunek danych do pozostałych klientów. Skrypt po stronie odbiorcy nakłada zmianę na stary tekst. Utrzymuje to wysoką wydajność działania i minimalizuje użycie łącza internetowego.
