import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PokerService, Room, User } from "../utils/poker.service";
import { ZardCardComponent } from "../shared/components/card";
import { ZardInputDirective } from "../shared/components/input";
import { ZardSelectComponent, ZardSelectItemComponent } from "../shared/components/select";
import { ZardButtonComponent } from "../shared/components/button";
import { ZardDarkMode } from "../shared/services";
import { ZardIconComponent } from "../shared/components/icon";
import { toast } from "ngx-sonner";

@Component({
  selector: 'app-poker-room',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardCardComponent, ZardInputDirective, ZardSelectComponent, ZardSelectItemComponent, ZardButtonComponent, ZardIconComponent],
  templateUrl: './poker-room.component.html',
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class PokerRoomComponent implements OnInit, OnDestroy {
  private pokerService = inject(PokerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly darkModeService = inject(ZardDarkMode)

  roomId!: string;
  currentUser: User | null = null;
  currentUsers: User[] = [];
  room: Room | null = null;
  stats: { average: string, mostVoted: string } | null = null;

  setupName = '';
  setupRole: 'player' | 'viewer' = 'player';

  private roomSub!: Subscription;
  private usersSub!: Subscription;
  private connectionSub!: Subscription;

  async ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.roomId) {
      this.router.navigate(['/']);
      return;
    }

    const savedSession = this.pokerService.getSession();
    if (savedSession) {
      this.currentUser = savedSession;
      this.initRoomConnection();
    }
  }

  ngOnDestroy() {
    if (this.connectionSub) this.connectionSub.unsubscribe();
    if (this.roomSub) this.roomSub.unsubscribe();
    if (this.usersSub) this.usersSub.unsubscribe();
  }

  joinWithNewUser() {
    this.currentUser = {
      id: generateUuid(),
      name: this.setupName,
      role: this.setupRole,
      vote: null
    };
    this.pokerService.saveSession(this.currentUser);
    this.initRoomConnection();
  }

  private initRoomConnection() {
    if (!this.currentUser) return;

    this.pokerService.joinRoom(this.roomId, this.currentUser);


    this.pokerService.getRoomUpdates(this.roomId).subscribe({
      next: (update) => {
        this.room = update.room;
        this.currentUsers = update.users;
        this.calculateStats();
      }
    });
  }

  calculateStats() {
    const votes = this.currentUsers.map(u => u.vote).filter(v => v !== null && v !== '');
    if (votes.length === 0) {
      this.stats = null;
      return;
    }

    let averageStr = '-';
    const numericVotes = votes
      .map(v => (v === '½' ? 0.5 : Number(v)))
      .filter(v => !isNaN(v));

    if (numericVotes.length > 0) {
      const sum = numericVotes.reduce((a, b) => a + b, 0);
      averageStr = (sum / numericVotes.length).toFixed(1).replace('.0', '');
    }

    const counts = votes.reduce((acc, val) => {
      acc[val as string] = (acc[val as string] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxCount = Math.max(...Object.values(counts));
    const mostVoted = Object.keys(counts).filter(k => counts[k] === maxCount).join(', ');

    this.stats = { average: averageStr, mostVoted: mostVoted };
  }

  vote(roomId: string, card: string) {
    if (!this.currentUser) return;

    this.pokerService.castVote(roomId, this.currentUser);
  }

  revealCards(roomId: string, reveal: boolean) {
    if (!reveal) {
      this.pokerService.resetRound(roomId);
      if (this.currentUser) this.currentUser.vote = null;
    } else {
      this.pokerService.toggleCards(roomId, reveal);
    }
  }

  copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast('Der Link wurde in deine Zwischenablage kopiert!')
    });
  }

  logout() {
    if (this.currentUser) {
      this.pokerService.leaveRoom(this.roomId, this.currentUser.id);
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
