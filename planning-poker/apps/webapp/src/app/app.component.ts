import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ZardToastComponent } from "./shared/components/toast";

@Component({
  imports: [RouterModule, ZardToastComponent],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {}
