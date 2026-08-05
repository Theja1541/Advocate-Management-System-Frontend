# Simplify Super Admin Tenant Access Provisioning

You requested that Super Admins should not have to micromanage whether a tenant wants View, Edit, or Approve access. Instead, Super Admins should simply act as a global switch to toggle whether a tenant has access to specific pages/modules.

## Proposed Changes

### Frontend Component (`Roles.jsx`)
- Detect if the page is being viewed by a Super Admin managing a tenant (`targetTenantId` is present).
- If viewed by a Super Admin, completely replace the complex Roles Matrix with a simplified list of **Tenant Modules**.
- Each module will have a simple ON/OFF toggle switch (or checkbox).

### Logic
When you toggle a module **ON**:
- We will assign full access (`VEA`) to that tenant's `Tenant Admin` role.
- All other roles (Advocates, Staff) will default to no access. The Tenant Admin can then log in themselves and configure their own team's granular permissions.

When you toggle a module **OFF**:
- We will revoke access from **all** roles inside that tenant immediately, fully shutting down the module for that tenant.

## Open Questions

> [!IMPORTANT]
> Is this exact logic correct? (i.e. When you toggle a page ON, the `Tenant Admin` gets full access, and then they decide who else gets it inside their firm?)

## Verification Plan
1. View a tenant's access page as a Super Admin and verify only simple ON/OFF toggles are present.
2. Toggle a page OFF and verify it revokes access across the board for that tenant.
