// Shared types for client-related operations between frontend and backend
export type ClientStatus = "active" | "inactive";

// Client entity type
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: ClientStatus;
  industry?: string | null;
  website?: string | null;
  address?: string | null;
  accountManagerId?: string | null;
  accountManager?: {
    id: string | null;
    name: string | null;
  } | null;
  projectCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientContact {
  id: string;
  firstName: string;
  lastName: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
}

// Interaction entity type
export interface ClientInteraction {
  id: string;
  type: string;
  date: string;
  summary: string;
  details?: string | null;
  followUpDate?: string | null;
  followUpNotes?: string | null;
  employee: {
    id: string;
    name: string;
  };
  contact?: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
  } | null;
}

// Query parameters for getClients
export interface GetClientsParams {
  page?: number;
  pageSize?: number;
  sorts?: Array<{ field: string; direction: "asc" | "desc" }>;
  filters?: Array<{ field: string; value: string }>;
}

// Client contact creation request type
export interface AddClientContactRequest {
  firstName: string;
  lastName: string;
  position?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

// Client interaction creation request type
export interface AddClientInteractionRequest {
  contactId?: string;
  type: string;
  summary: string;
  details?: string;
  followUpDate?: string;
  followUpNotes?: string;
}

// Client creation request type
export interface CreateClientRequest {
  name: string;
  industry?: string;
  website?: string;
  address?: string;
  accountManagerId?: string;
}

// Client update request type
export interface UpdateClientRequest {
  name: string;
  industry?: string;
  website?: string;
  address?: string;
  accountManagerId?: string;
}
