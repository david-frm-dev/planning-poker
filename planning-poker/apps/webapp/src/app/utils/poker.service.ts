import { Injectable, inject, NgZone } from '@angular/core';
import { Database, ref, set, update, remove, onDisconnect, onValue, get } from '@angular/fire/database';
import { Observable } from 'rxjs';

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

// Konstante für die verfügbaren Kartendecks
export const POKER_DECKS = {
  standard: ['1', '2', '3', '5', '8', '13', '21', '☕', '?'],
  modified: ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '☕', '?'],
};

export type DeckType = keyof typeof POKER_DECKS;

@Injectable({
  providedIn: 'root'
})
export class PokerService {
  private db: Database = inject(Database);
  private zone = inject(NgZone);
  private readonly SESSION_KEY = 'poker_session';

  async checkRoomExists(roomId: string): Promise<boolean> {
    const snapshot = await get(ref(this.db, `rooms/${roomId}`));
    return snapshot.exists();
  }

  generateRoomId(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateUuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // === SESSION MANAGEMENT ===
  getSession(): User | null {
    const data = localStorage.getItem(this.SESSION_KEY);
    return data ? JSON.parse(data) : null;
  }

  saveSession(user: User): void {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
  }

  clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
  }

  // === RÄUME ===
  async createRoom(roomId: string, name: string, deck: string[]): Promise<void> {
    const roomRef = ref(this.db, `rooms/${roomId}`);
    await set(roomRef, { id: roomId, name, deck, cardsRevealed: false, createdAt: Date.now() });
  }

  getRoom(roomId: string): Observable<Room> {
    return new Observable<Room>(observer => {
      const unsubscribe = onValue(ref(this.db, `rooms/${roomId}`), (snapshot) => {
        this.zone.run(() => observer.next(snapshot.val() as Room));
      });
      return () => unsubscribe();
    });
  }

  getUsersInRoom(roomId: string): Observable<User[]> {
    return new Observable<User[]>(observer => {
      const unsubscribe = onValue(ref(this.db, `room_users/${roomId}`), (snapshot) => {
        this.zone.run(() => {
          const data = snapshot.val();
          observer.next(data ? Object.values(data) : []);
        });
      });
      return () => unsubscribe();
    });
  }

  async toggleCards(roomId: string, revealed: boolean): Promise<void> {
    await update(ref(this.db, `rooms/${roomId}`), { cardsRevealed: revealed });
  }

  async resetRound(roomId: string, users: User[]): Promise<void> {
    const updates: Record<string, any> = {};
    updates[`rooms/${roomId}/cardsRevealed`] = false;

    users.forEach(u => {
      updates[`room_users/${roomId}/${u.id}/vote`] = null;
    });

    await update(ref(this.db), updates);
  }

  async joinRoom(roomId: string, user: User): Promise<void> {
    const userRef = ref(this.db, `room_users/${roomId}/${user.id}`);
    await onDisconnect(userRef).cancel();
    await onDisconnect(userRef).remove();
    await set(userRef, user);
  }

  monitorConnection(): Observable<boolean | null> {
    return new Observable<boolean | null>(observer => {
      const unsubscribe = onValue(ref(this.db, '.info/connected'), (snap) => {
        this.zone.run(() => observer.next(snap.val()));
      });
      return () => unsubscribe();
    });
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const userRef = ref(this.db, `room_users/${roomId}/${userId}`);
    await remove(userRef);
  }

  async castVote(roomId: string, user: User): Promise<void> {
    const userRef = ref(this.db, `room_users/${roomId}/${user.id}`);
    await set(userRef, user);
  }
}
