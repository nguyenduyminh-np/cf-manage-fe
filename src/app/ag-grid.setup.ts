import {
  DateFilterModule,
  ModuleRegistry,
  NumberFilterModule,
  TextFilterModule,
} from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([
  AllCommunityModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
]);
