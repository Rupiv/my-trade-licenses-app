import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-business-owner',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './business-owner.html',
  styleUrl: './business-owner.css',
})
export class BusinessOwner {

}
