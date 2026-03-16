import { ContentComponent } from 'apps/webapp/src/app/shared/components/layout/content.component';
import { FooterComponent } from 'apps/webapp/src/app/shared/components/layout/footer.component';
import { HeaderComponent } from 'apps/webapp/src/app/shared/components/layout/header.component';
import { LayoutComponent } from 'apps/webapp/src/app/shared/components/layout/layout.component';
import {
  SidebarComponent,
  SidebarGroupComponent,
  SidebarGroupLabelComponent,
} from 'apps/webapp/src/app/shared/components/layout/sidebar.component';

export const LayoutImports = [
  LayoutComponent,
  HeaderComponent,
  FooterComponent,
  ContentComponent,
  SidebarComponent,
  SidebarGroupComponent,
  SidebarGroupLabelComponent,
] as const;
