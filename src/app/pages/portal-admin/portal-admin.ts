import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-portal-admin',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './portal-admin.html',
  styleUrl: './portal-admin.css',
})
export class PortalAdmin {
  
}
