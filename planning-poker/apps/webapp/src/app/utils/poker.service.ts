import { inject, Injectable, NgZone }                         from '@angular/core';
import { firstValueFrom, Observable }                         from 'rxjs';
import { Room, RoomsService, RoomUpdate, User, UsersService } from '@planning-poker/api-client';

export type { Room, User, RoomUpdate };

@Injectable({ providedIn: 'root' })
export class PokerService {
  private roomsService = inject(RoomsService);
  private usersService = inject(UsersService);
  private zone = inject(NgZone);
  private readonly SSE_BASE = '/api/rooms';
  private readonly SESSION_KEY = 'poker_session';

  async checkRoomExists(roomId: string): Promise<boolean> {
    const response = await firstValueFrom(this.roomsService.checkRoomExists(roomId));
    return response.exists;
  }

  async createRoom(name: string, deck: string[], calculateStats: boolean): Promise<string> {
    const response = await firstValueFrom(this.roomsService.createRoom({ name, deck, calculateStats }));
    return response.roomId;
  }

  // SSE stream – uses native EventSource since the generated client has no streaming support.
  // The beforeunload listener closes the connection cleanly before the browser force-kills it,
  // which prevents the "connection interrupted while page was loading" browser console error.
  getRoomUpdates(roomId: string): Observable<RoomUpdate> {
    return new Observable(observer => {
      const eventSource = new EventSource(`${this.SSE_BASE}/${roomId}/updates`);

      const closeOnUnload = () => eventSource.close();
      window.addEventListener('beforeunload', closeOnUnload, { once: true });

      eventSource.onmessage = (event) => {
        this.zone.run(() => observer.next(JSON.parse(event.data) as RoomUpdate));
      };
      eventSource.onerror = (err) => this.zone.run(() => observer.error(err));

      return () => {
        window.removeEventListener('beforeunload', closeOnUnload);
        eventSource.close();
      };
    });
  }

  async joinRoom(roomId: string, user: User): Promise<void> {
    this.saveSession(user);
    await firstValueFrom(this.usersService.joinRoom(roomId, user));
  }

  async castVote(roomId: string, user: User): Promise<void> {
    await firstValueFrom(
      this.roomsService.castVote(roomId, { userId: user.id, vote: user.vote ?? undefined })
    );
    this.saveSession(user);
  }

  async toggleCards(roomId: string, revealed: boolean): Promise<void> {
    await firstValueFrom(this.roomsService.toggleCards(roomId, { revealed }));
  }

  async resetRound(roomId: string): Promise<void> {
    await firstValueFrom(this.roomsService.resetRound(roomId));
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await firstValueFrom(this.usersService.leaveRoom(roomId, { userId }));
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
