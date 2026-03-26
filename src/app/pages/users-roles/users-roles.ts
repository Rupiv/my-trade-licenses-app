import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';

import {
  UsersRolesService,
  LoginMaster,
  OfficeDetail,
  UserDesignation,
  LoginMasterRequest,
} from './user-roles.service';
import { Zones } from '../../core/models/new-trade-licenses.model';
import { LoaderService } from '../../shared/components/loader/loader.service';

/* ─────────────────────────────────────────────
   Toast notification model
───────────────────────────────────────────── */
interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning';
  message: string;
}

/* ─────────────────────────────────────────────
   Empty user factory
───────────────────────────────────────────── */
function emptyUser(): LoginMaster {
  return {
    loginID: 0,
    login: '',
    password: '',
    zoneID: 0,
    officeDetailsID: 0,
    userDesignationID: 0,
    sakalaDO_Code: '',
    MobileNo: '',
    isActive: 'Y',
  };
}

@Component({
  selector: 'app-users-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-roles.html',
  styleUrl: './users-roles.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersRoles implements OnInit, OnDestroy {

  /* ─── Destroy signal ─────────────────────── */
  private readonly destroy$ = new Subject<void>();

  /* ─── Search stream ──────────────────────── */
  private readonly searchInput$ = new Subject<string>();

  /* ─── Grid / Pagination ──────────────────── */
  users: LoginMaster[] = [];
  pageNumber = 1;
  pageSize   = 10;
  totalRecords = 0;
  isLoading  = false;
  isSearching = false;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  /* ─── Search ─────────────────────────────── */
  searchText = '';

  /* ─── Dropdowns ──────────────────────────── */
  zones: Zones[] = [];
  officeList: OfficeDetail[] = [];
  designationList: UserDesignation[] = [];

  /* ─── Form state ─────────────────────────── */
  selectedUser: LoginMaster | null = null;
  isEditMode = false;
  isSaving   = false;

  /* ─── Delete modal ───────────────────────── */
  showDeleteModal = false;
  userToDeleteId: number | null = null;
  isDeleting = false;

  /* ─── Toast notifications ────────────────── */
  toasts: Toast[] = [];
  private toastCounter = 0;

  /* ─────────────────────────────────────────── */
  constructor(
    private readonly usersRolesService: UsersRolesService,
    private readonly loaderService: LoaderService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  /* ══════════════════════════════════════════
     LIFECYCLE
  ══════════════════════════════════════════ */

  ngOnInit(): void {
    this.initSearchStream();
    this.loadDropdowns();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ══════════════════════════════════════════
     SEARCH STREAM  (debounced, RxJS-based)
  ══════════════════════════════════════════ */

  private initSearchStream(): void {
    this.searchInput$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((term) => {
        if (!term.trim()) {
          this.resetSearch();
        } else {
          this.executeSearch(term, 1);
        }
      });
  }

  onSearchChange(): void {
    this.searchInput$.next(this.searchText);
  }

  clearSearch(): void {
    this.searchText = '';
    this.resetSearch();
  }

  private resetSearch(): void {
    this.isSearching = false;
    this.pageNumber  = 1;
    this.loadUsers();
  }

  private executeSearch(term: string, page: number): void {
    this.isSearching  = true;
    this.pageNumber   = page;
    this.isLoading    = true;

    this.usersRolesService
      .searchUsers(term, page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.users        = res.data ?? [];
          this.totalRecords = res.totalRecords ?? 0;
          this.isLoading    = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          //console.error('Search failed:', err);
          this.isLoading = false;
          this.showToast('error', 'Search failed. Please try again.');
          this.cdr.markForCheck();
        },
      });
  }

  /* ══════════════════════════════════════════
     LOAD USERS  (paginated)
  ══════════════════════════════════════════ */

  loadUsers(): void {
    this.isLoading = true;

    this.usersRolesService
      .getUsers(this.pageNumber, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.users        = res.data ?? [];
          this.totalRecords = res.totalRecords ?? 0;
          this.isLoading    = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          //console.error('Load users failed:', err);
          this.isLoading = false;
          this.showToast('error', 'Failed to load users.');
          this.cdr.markForCheck();
        },
      });
  }

  /* ══════════════════════════════════════════
     DROPDOWNS
  ══════════════════════════════════════════ */

  private loadDropdowns(): void {
    this.loadZones();
    this.loadOffices();
    this.loadDesignations();
  }

  private loadZones(): void {
    this.usersRolesService
      .getZones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.zones = res;
          this.cdr.markForCheck();
        },
        error: (err) => {
          //console.error('Zone load failed:', err),
        }
      });
  }

  private loadOffices(): void {
    this.usersRolesService
      .getOfficeDetails()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.officeList = res;
          this.cdr.markForCheck();
        },
        error: (err) => {
          //console.error('Office load failed:', err),
        }
      });
  }

  private loadDesignations(): void {
    this.usersRolesService
      .getUserDesignations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.designationList = res.filter((d) => d.isActive === 'Y');
          this.cdr.markForCheck();
        },
        error: (err) => {
          //console.error('Designation load failed:', err),
        }
      });
  }

  /* ══════════════════════════════════════════
     ADD USER
  ══════════════════════════════════════════ */

  addNewUser(): void {
    this.selectedUser = emptyUser();
    this.isEditMode   = false;
    this.scrollToForm();
  }

  /* ══════════════════════════════════════════
     EDIT USER  ✅ properly clones & populates
  ══════════════════════════════════════════ */

  editUser(user: LoginMaster): void {
    /* Deep-clone so live table row is never mutated before save */
    this.selectedUser = {
      ...user,
      password: '', // never bind existing hash to the field
    };
    this.isEditMode = true;
    this.scrollToForm();
  }

  /* ══════════════════════════════════════════
     CANCEL FORM
  ══════════════════════════════════════════ */

  cancelForm(): void {
    this.selectedUser = null;
    this.isEditMode   = false;
    this.isSaving     = false;
    this.cdr.markForCheck();
  }

  /* ══════════════════════════════════════════
     SAVE (INSERT / UPDATE)
  ══════════════════════════════════════════ */

  saveUser(): void {
    if (!this.selectedUser) return;

    const validationError = this.validateUserForm(this.selectedUser);
    if (validationError) {
      this.showToast('warning', validationError);
      return;
    }

    this.isSaving = true;

    const payload: LoginMasterRequest = {
      login:             this.selectedUser.login.trim(),
      password:          this.selectedUser.password?.trim() ?? '',
      officeDetailsID:   Number(this.selectedUser.officeDetailsID),
      userDesignationID: Number(this.selectedUser.userDesignationID),
      sakalaDO_Code:     this.selectedUser.sakalaDO_Code?.trim() ?? '',
      mobileNo:          this.selectedUser.MobileNo?.trim() ?? '',
      updatedBy:         this.getLoggedInUserId(),
    };

    if (this.isEditMode && this.selectedUser.loginID) {
      this.updateUser(this.selectedUser.loginID, payload);
    } else {
      this.insertUser(payload);
    }
  }

  private insertUser(payload: LoginMasterRequest): void {
    this.usersRolesService
      .addUser(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.showToast('success', 'User added successfully.');
          this.cancelForm();
          this.pageNumber = 1;
          this.refreshList();
        },
        error: (err) => {
          //console.error('Add user failed:', err);
          this.isSaving = false;
          this.showToast('error', 'Failed to add user. Please try again.');
          this.cdr.markForCheck();
        },
      });
  }

  private updateUser(loginID: number, payload: LoginMasterRequest): void {
    this.usersRolesService
      .updateUser(loginID, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.showToast('success', 'User updated successfully.');
          this.cancelForm();
          this.refreshList();
        },
        error: (err) => {
          //console.error('Update user failed:', err);
          this.isSaving = false;
          this.showToast('error', 'Failed to update user. Please try again.');
          this.cdr.markForCheck();
        },
      });
  }

  /* ══════════════════════════════════════════
     DELETE  ✅ uses modal, not browser confirm
  ══════════════════════════════════════════ */

  requestDeleteUser(loginID: number): void {
    this.userToDeleteId = loginID;
    this.showDeleteModal = true;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.userToDeleteId  = null;
    this.showDeleteModal = false;
    this.isDeleting      = false;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    if (this.userToDeleteId === null) return;

    this.isDeleting = true;

    this.usersRolesService
      .deleteUser(this.userToDeleteId, this.getLoggedInUserId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showToast('success', 'User deleted successfully.');
          this.cancelDelete();

          /* If last item on page > 1, go back one page */
          if (this.users.length === 1 && this.pageNumber > 1) {
            this.pageNumber--;
          }
          this.refreshList();
        },
        error: (err) => {
          //console.error('Delete user failed:', err);
          this.isDeleting = false;
          this.showToast('error', 'Failed to delete user. Please try again.');
          this.cdr.markForCheck();
        },
      });
  }

  /* ══════════════════════════════════════════
     PAGINATION
  ══════════════════════════════════════════ */

  nextPage(): void {
    if (this.pageNumber >= this.totalPages) return;
    this.pageNumber++;
    this.refreshList();
  }

  prevPage(): void {
    if (this.pageNumber <= 1) return;
    this.pageNumber--;
    this.refreshList();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) return;
    this.pageNumber = page;
    this.refreshList();
  }

  /* Visible page numbers (windowed) */
  get visiblePages(): number[] {
    const total   = this.totalPages;
    const current = this.pageNumber;
    const delta   = 2; // pages on each side
    const pages: number[] = [];

    for (
      let i = Math.max(1, current - delta);
      i <= Math.min(total, current + delta);
      i++
    ) {
      pages.push(i);
    }
    return pages;
  }

  /* ══════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════ */

  private refreshList(): void {
    this.isSearching ? this.executeSearch(this.searchText, this.pageNumber) : this.loadUsers();
  }

  getOfficeName(id: number): string {
    return this.officeList.find((o) => o.officeID === id)?.officeName ?? '—';
  }

  getDesignationName(id: number): string {
    return (
      this.designationList.find((d) => d.userDesignationId === id)
        ?.userDesignationName ?? '—'
    );
  }

  private getLoggedInUserId(): number {
    /* Replace with your actual auth service call */
    return 1;
  }

  private scrollToForm(): void {
    setTimeout(() => {
      document.querySelector('.form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  /* ══════════════════════════════════════════
     FORM VALIDATION
  ══════════════════════════════════════════ */

  private validateUserForm(user: LoginMaster): string | null {
    if (!user.login?.trim()) return 'User name is required.';
    if (!this.isEditMode && !user.password?.trim()) return 'Password is required.';
    if (!user.MobileNo?.trim()) return 'Mobile number is required.';
    if (!/^\d{10}$/.test(user.MobileNo.trim())) return 'Mobile number must be exactly 10 digits.';
    if (!+user.officeDetailsID) return 'Please select an office.';
    if (!+user.userDesignationID) return 'Please select a designation.';
    return null;
  }

  /* ══════════════════════════════════════════
     TOAST NOTIFICATIONS
  ══════════════════════════════════════════ */

  showToast(type: Toast['type'], message: string): void {
    const id = ++this.toastCounter;
    this.toasts = [...this.toasts, { id, type, message }];
    this.cdr.markForCheck();

    /* Auto-dismiss after 4 s */
    timer(4000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.dismissToast(id));
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.cdr.markForCheck();
  }

  trackByToast(_: number, t: Toast): number { return t.id; }
  trackByUser(_: number, u: LoginMaster): number { return u.loginID; }
}