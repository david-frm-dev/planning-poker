import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DeckType, POKER_DECKS, PokerService } from "../utils/poker.service";
import { ZardCardComponent } from "../shared/components/card";
import { ZardInputDirective } from "../shared/components/input";
import { ZardSelectComponent, ZardSelectItemComponent } from "../shared/components/select";
import { ZardButtonComponent } from "../shared/components/button";
import { toast } from "ngx-sonner";
import { ZardDarkMode } from "../shared/services";
import { ZardIconComponent } from "../shared/components/icon";
import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appNumberOnly]'
})
export class NumberOnlyDirective {

  @HostListener('keypress', ['$event'])
  onKeyPress(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow only digits (0-9)
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    const pastedInput: string = event.clipboardData?.getData('text') ?? '';
    if (!/^\d+$/.test(pastedInput)) {
      event.preventDefault();
    }
  }
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ZardCardComponent, ZardInputDirective, ZardSelectComponent, ZardSelectItemComponent, ZardButtonComponent, ZardIconComponent, NumberOnlyDirective],
  templateUrl: 'home.component.html',
})
export class HomeComponent {
  private router = inject(Router);
  private pokerService = inject(PokerService);
  private readonly darkModeService = inject(ZardDarkMode);

  newRoomName = '';
  joinRoomId = '';

  deckOptions: { label: string, value: DeckType }[] = [
    { label: 'Modified Fibonacci (0, ½, 1, 2, 3...)', value: 'modified' },
    { label: 'Standard Fibonacci (1, 2, 3, 5, 8...)', value: 'standard' }
  ];

  selectedDeckId: DeckType = 'modified';

  async createRoom() {
    if (!this.newRoomName) return;
    const deckArray = POKER_DECKS[this.selectedDeckId];

    const roomId = await this.pokerService.createRoom(this.newRoomName, deckArray);
    await this.router.navigate(['/room', roomId]);
  }

  async joinRoom() {
    if (this.joinRoomId.length === 6) {

      const roomExists = await this.pokerService.checkRoomExists(this.joinRoomId);
      const errMsg: string = `Es konnte kein Raum mit Raum Id: ${ this.joinRoomId } gefunden werden!`;
      if (!roomExists) {
        toast(errMsg);
        return;
      }

      this.router.navigate(['/room', this.joinRoomId]);
    }
  }

  toggleTheme () {
    this.darkModeService.toggleTheme();
  }
}
