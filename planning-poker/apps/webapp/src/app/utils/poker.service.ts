import { HttpClient } from '@angular/common/http';
import { Injectable, inject, NgZone } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

export interface Room {
  id: string;
  name: string;
  deck: string[];
  cardsRevealed: boolean;
}

export interface User {
  id: string;
  name: string;
  role: 'player' | 'viewer';
  vote: string | null;
}

export interface RoomUpdate {
  room: Room;
  users: User[];
}

// Konstante für die verfügbaren Kartendecks
export const POKER_DECKS = {
  standard: ['1', '2', '3', '5', '8', '13', '21', '☕', '?'],
  modified: ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '☕', '?'],
};

export type DeckType = keyof typeof POKER_DECKS;

@Injectable({ providedIn: 'root' })
export class PokerService {
  private http = inject(HttpClient);
  private zone = inject(NgZone);
  // In DEVELOPMENT 'http://localhost:8080/api/rooms' in fusion mode 'api/rooms'
  private readonly API_URL = 'http://localhost:8080/api/rooms';
  private readonly SESSION_KEY = 'poker_session';

  async checkRoomExists(roomId: string): Promise<boolean> {
    return firstValueFrom(this.http.get<boolean>(`${this.API_URL}/${roomId}/exists`));
  }

  async createRoom(name: string, deck: string[]): Promise<string> {
    return await firstValueFrom(this.http.post(this.API_URL, { name, deck }, { responseType: 'text' }));
  }

  // Kombinierter Stream für Room + Users via SSE
  getRoomUpdates(roomId: string): Observable<RoomUpdate> {
    return new Observable(observer => {
      const eventSource = new EventSource(`${this.API_URL}/${roomId}/updates`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.zone.run(() => observer.next(data));
        } catch (error) {
          console.warn('Kein gültiges JSON empfangen:', event.data);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('SSE Connection dropped. Browser is attempting auto-reconnect...', err);
      };

      return () => {
        console.log('Cleaning up SSE connection');
        eventSource.close();
      };
    });
  }

  async joinRoom(roomId: string, user: User): Promise<void> {
    this.saveSession(user);
    await firstValueFrom(this.http.post(`${this.API_URL}/${roomId}/join`, user));
  }

  async castVote(roomId: string, user: User): Promise<void> {
    await firstValueFrom(this.http.post(`${this.API_URL}/${roomId}/vote`, { userId: user.id, vote: user.vote }));
  }

  async toggleCards(roomId: string, revealed: boolean): Promise<void> {
    await firstValueFrom(this.http.post(`${this.API_URL}/${roomId}/toggle`, { revealed }));
  }

  async resetRound(roomId: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.API_URL}/${roomId}/reset`, {}));
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.API_URL}/${roomId}/leave`, { userId }));
    this.clearSession();
  }

  saveSession(user: User): void {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
  }

  getSession(): User | null {
    const data = localStorage.getItem(this.SESSION_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as User;
    } catch (e) {
      console.error('Failed to parse session', e);
      return null;
    }
  }

  clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
  }
}
