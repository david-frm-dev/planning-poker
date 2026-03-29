import { Component, DestroyRef, inject, input, OnInit, output, signal } from "@angular/core";
import { ZardButtonComponent }                                          from "../../shared/components/button";
import { ZardIconComponent }                                            from "../../shared/components/icon";
import { Issue, IssuesService }                                         from "@planning-poker/api-client";
import { takeUntilDestroyed }                                           from "@angular/core/rxjs-interop";
import { PokerService }                                                 from "../../utils/poker.service";
import { ZardCardComponent }                                            from "../../shared/components/card";

@Component({
  selector: "issue-sidebar",
  templateUrl: "./issue-sidebar.component.html",
  imports: [
    ZardButtonComponent,
    ZardIconComponent,
    ZardCardComponent
  ],
})
export class IssueSidebarComponent implements OnInit {
  private readonly issueApi = inject(IssuesService);
  private readonly pokerService = inject(PokerService);
  private readonly destroyRef = inject(DestroyRef);

  readonly roomId = input.required<string>();
  readonly selectedIssue = output<Issue | null>();

  readonly isOpen = signal(true);
  readonly issues = signal<Issue[] | null>(null);

  showSidebar() {
    this.isOpen.set(true);
  }

  closeSidebar() {
    this.isOpen.set(false);
  }

  ngOnInit(): void {
    this.listenToIssueUpdates();
  }

  private listenToIssueUpdates(): void {
    this.pokerService.getRoomUpdates(this.roomId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (update) => {
          this.issues.set(update.issues ?? []);
        },
        error: err => {
          console.error('Fehler beim SSE Stream in der Sidebar', err);
        }
      });
  }

  add(): void {
    this.issueApi.addIssue(this.roomId(), { title: "This is a Title", link: "This is a link" })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: err => console.error(err)
      });
  }

  start(issueId: string): void {
    this.issueApi.startIssueVoting(this.roomId(), issueId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          const _selectedIssue = this.issues()?.find(v => v.id == issueId);
          if (response && _selectedIssue) {
            this.selectedIssue.emit(_selectedIssue);
          }
        },
        error: err => console.error(err)
      });
  }

  finish(issueId: string, average: string | undefined, agreedAverage: string | undefined): void {
    this.issueApi.finishIssueVoting(this.roomId(), issueId, { average: average, agreedAverage: agreedAverage })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (response) {
            this.selectedIssue.emit(null);
          }
        },
        error: err => console.error(err)
      });
  }
}
