import { Component } from "@angular/core";
import { LayoutImports } from "../shared/components/layout";

@Component({
  selector: 'app-playground',
  imports: [
    LayoutImports
  ],
  template: `
    <div class="flex flex-col gap-6 text-center justify-center">
      <z-layout class="overflow-hidden rounded-lg">
        <z-header class="h-16 justify-center border-0 bg-[#4096ff] px-12 text-white">Header</z-header>

        <z-layout [zDirection]="'horizontal'" [class]="'flex! flex- row! w-full h-full'">
          <z-content class="min-h-50">Content</z-content>

          <z-sidebar class="min-h-50">Sidebar</z-sidebar>
        </z-layout>

        <z-footer >Footer</z-footer>
      </z-layout>
    </div>
  `
})
export class PlaygroundComponent {

}
