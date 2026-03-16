import { Component, signal } from "@angular/core";
import { ZardButtonComponent } from "../../shared/components/button";
import { ZardIconComponent } from "../../shared/components/icon";

@Component({
  selector: "issue-sidebar",
  templateUrl: "./issue-sidebar.component.html",
  imports: [
    ZardButtonComponent,
    ZardIconComponent
  ],
})
export class IssueSidebarComponent {
  isOpen = signal(true);

  showSidebar() {
    this.isOpen.set(true);
  }

  closeSidebar() {
    this.isOpen.set(false);
  }
}
