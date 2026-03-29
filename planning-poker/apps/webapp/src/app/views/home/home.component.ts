import { Component, Directive, HostListener, inject }   from '@angular/core';
import { CommonModule }                                 from '@angular/common';
import { FormsModule }                                  from '@angular/forms';
import { Router }                                       from '@angular/router';
import { PokerService }                                 from "../../utils/poker.service";
import { ZardCardComponent }                            from "../../shared/components/card";
import { ZardInputDirective }                           from "../../shared/components/input";
import { ZardSelectComponent, ZardSelectItemComponent } from "../../shared/components/select";
import { ZardButtonComponent }                          from "../../shared/components/button";
import { toast }                                        from "ngx-sonner";
import { ZardDarkMode }                                 from "../../shared/services";
import { ZardIconComponent }                            from "../../shared/components/icon";

@Directive({
  selector: '[appNumberOnly]'
})
export class NumberOnlyDirective {

  @HostListener('keypress', ['$event'])
  onKeyPress(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
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

export const POKER_DECKS: Record<string, string[]> = {
  modified: ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '☕', '?'],
  standard: ['1', '2', '3', '5', '8', '13', '21', '☕', '?'],
  powers2: ['1', '2', '4', '8', '16', '32', '64', '☕', '?'],
  tshirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '☕', '?'],
};

const DECK_DEFAULT_STATS: Record<string, boolean> = {
  modified: true,
  standard: true,
  powers2: true,
  tshirt: false,
  custom: false,
};

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
  selectedDeckId = 'modified';
  customDeckInput = '';
  calculateStats = true;

  deckOptions = [
    { label: 'Modified Fibonacci (0, ½, 1, 2, 3, 5…)', value: 'modified' },
    { label: 'Standard Fibonacci (1, 2, 3, 5, 8, 13…)', value: 'standard' },
    { label: 'Potenzen von 2 (1, 2, 4, 8, 16…)', value: 'powers2' },
    { label: 'T-Shirt Größen (XS, S, M, L, XL…)', value: 'tshirt' },
    { label: 'Benutzerdefiniert', value: 'custom' },
  ];

  onDeckChange() {
    this.calculateStats = DECK_DEFAULT_STATS[this.selectedDeckId] ?? false;
  }

  getSelectedDeck(): string[] {
    if (this.selectedDeckId === 'custom') {
      return this.customDeckInput.split(',').map(s => s.trim()).filter(Boolean);
    }
    return POKER_DECKS[this.selectedDeckId] ?? [];
  }

  isCreateDisabled(): boolean {
    if (!this.newRoomName) return true;
    if (this.selectedDeckId === 'custom' && this.getSelectedDeck().length === 0) return true;
    return false;
  }

  async createRoom() {
    if (this.isCreateDisabled()) return;
    const deck = this.getSelectedDeck();
    try {
      const roomId = await this.pokerService.createRoom(this.newRoomName, deck, this.calculateStats);
      await this.router.navigate(['/room', roomId]);
    } catch {
      toast('Fehler beim Erstellen des Raums. Bitte erneut versuchen.');
    }
  }

  async joinRoom() {
    if (this.joinRoomId.length !== 6) return;
    try {
      const roomExists = await this.pokerService.checkRoomExists(this.joinRoomId);
      if (!roomExists) {
        toast(`Es konnte kein Raum mit Raum Id: ${this.joinRoomId} gefunden werden!`);
        return;
      }
      this.router.navigate(['/room', this.joinRoomId]);
    } catch {
      toast('Fehler beim Suchen des Raums. Bitte erneut versuchen.');
    }
  }

  toggleTheme () {
    this.darkModeService.toggleTheme();
  }
}
