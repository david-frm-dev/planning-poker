import { Component, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule }                                            from '@angular/common';
import { FormsModule }                                             from '@angular/forms';
import { ActivatedRoute, Router }                                  from '@angular/router';
import { retry, Subscription, timer }                              from 'rxjs';
import { PokerService, Room, User }                                from "../../utils/poker.service";
import { ZardCardComponent }                                       from "../../shared/components/card";
import { ZardInputDirective }                                      from "../../shared/components/input";
import { ZardSelectComponent, ZardSelectItemComponent }            from "../../shared/components/select";
import { ZardButtonComponent }                                     from "../../shared/components/button";
import { ZardDarkMode }                                            from "../../shared/services";
import { ZardIconComponent }                                       from "../../shared/components/icon";
import { toast }                                                   from "ngx-sonner";
import { IssueSidebarComponent }                                   from "../issue-sidebar/issue-sidebar.component";
import { Issue }                                                   from "@planning-poker/api-client";

const SSE_MAX_RETRIES = 5;

@Component({
  selector: 'app-poker-room',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardCardComponent, ZardInputDirective, ZardSelectComponent, ZardSelectItemComponent, ZardButtonComponent, ZardIconComponent, IssueSidebarComponent],
  templateUrl: './poker-room.component.html',
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class PokerRoomComponent implements OnInit, OnDestroy {
  private pokerService = inject(PokerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly darkModeService = inject(ZardDarkMode);

  roomId!: string;
  currentUser: User | null = null;
  currentUsers: User[] = [];
  room: Room | null = null;
  stats: { average: string, median: string | null } | null = null;

  setupName = '';
  setupRole: 'player' | 'viewer' = 'player';

  private connectionSub?: Subscription;

  readonly selectedIssue = signal<Issue | null>(null);

  readonly issueCompVC = viewChild(IssueSidebarComponent);

  async ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.roomId) {
      this.router.navigate(['/']);
      return;
    }

    try {
      const exists = await this.pokerService.checkRoomExists(this.roomId);
      if (!exists) {
        toast('Dieser Raum existiert nicht.');
        this.router.navigate(['/']);
        return;
      }
    } catch {
      toast('Fehler beim Laden des Raums.');
      this.router.navigate(['/']);
      return;
    }

    const savedSession = this.pokerService.getSession();
    if (savedSession) {
      this.currentUser = savedSession;
      await this.initRoomConnection();
    }
  }

  ngOnDestroy() {
    this.connectionSub?.unsubscribe();
  }

  async joinWithNewUser() {
    this.currentUser = {
      id: generateUuid(),
      name: this.setupName,
      role: this.setupRole,
      vote: undefined
    };
    this.pokerService.saveSession(this.currentUser);
    await this.initRoomConnection();
  }

  private async initRoomConnection() {
    if (!this.currentUser) return;

    try {
      await this.pokerService.joinRoom(this.roomId, this.currentUser);
    } catch {
      toast('Fehler beim Beitreten des Raums.');
      this.router.navigate(['/']);
      return;
    }

    this.connectionSub = this.pokerService.getRoomUpdates(this.roomId).pipe(
      retry({
        count: SSE_MAX_RETRIES,
        delay: (_, retryCount) => {
          toast(`Verbindung unterbrochen – Versuch ${retryCount}/${SSE_MAX_RETRIES}...`);
          return timer(2000);
        }
      })
    ).subscribe({
      next: (update) => {
        this.room = update.room;
        this.currentUsers = update.users;
        // Keep currentUser.vote in sync with server truth (survives reload/rejoin)
        const serverUser = update.users.find(u => u.id === this.currentUser?.id);
        if (serverUser && this.currentUser) {
          this.currentUser = {...this.currentUser, vote: serverUser.vote};
        }
        this.calculateStats();
      },
      error: () => {
        toast('Verbindung verloren. Zurück zur Startseite...');
        this.router.navigate(['/']);
      }
    });
  }

  calculateStats() {
    if (!this.room?.calculateStats) {
      this.stats = null;
      return;
    }

    // Only count players who actually voted — exclude non-voters and viewers
    const votes = this.currentUsers
      .filter(u => u.role === 'player')
      .map(u => u.vote)
      .filter((v): v is string => v !== undefined && v !== null && v !== '');

    if (votes.length === 0) {
      this.stats = null;
      return;
    }

    const numericVotes = votes
      .map(v => (v === '½' ? 0.5 : Number(v)))
      .filter(v => !isNaN(v));

    if (numericVotes.length === 0) {
      // All votes are non-numeric (e.g. t-shirt sizes, ?, ☕) — no stats
      this.stats = null;
      return;
    }

    const sum = numericVotes.reduce((a, b) => a + b, 0);
    const avg = sum / numericVotes.length;
    const averageStr = avg.toFixed(1).replace('.0', '');

    const sorted = [...numericVotes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
    const medianStr = median.toFixed(1).replace('.0', '');

    this.stats = {
      average: averageStr,
      median: medianStr !== averageStr ? medianStr : null,
    };
  }

  async vote(roomId: string, card: string) {
    if (!this.currentUser) return;
    const previousVote = this.currentUser.vote;
    this.currentUser.vote = card;
    try {
      await this.pokerService.castVote(roomId, this.currentUser);
    } catch {
      this.currentUser.vote = previousVote;
      toast('Fehler beim Abstimmen.');
    }
  }

  async revealCards(roomId: string, reveal: boolean) {
    try {
      if (!reveal) {
        const _selectedIssue = this.selectedIssue();

        if (_selectedIssue?.id != null) this.issueCompVC()?.finish(_selectedIssue.id, this.stats?.average, this.stats?.average)

        await this.pokerService.resetRound(roomId);

        if (this.currentUser) this.currentUser.vote = undefined;
      } else {
        await this.pokerService.toggleCards(roomId, reveal);
      }
    } catch {
      toast('Fehler beim Ändern des Kartenstatus.');
    }
  }

  copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast('Der Link wurde in deine Zwischenablage kopiert!');
    });
  }

  logout() {
    if (this.currentUser) {
      this.pokerService.leaveRoom(this.roomId, this.currentUser.id).catch(() => {
      });
    }
    this.pokerService.clearSession();
    this.currentUser = null;
    this.router.navigate(['/']);
  }

  toggleTheme() {
    this.darkModeService.toggleTheme();
  }
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
