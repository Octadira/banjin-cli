/**
 * Structuri pentru profilare server și audit log
 * Toate datele sunt stocate local, conform designului.
 */

/**
 * Profil complet al unui server, folosit pentru /profile collect/show/diff/summarize
 */
export interface ServerProfile {
  /** Identificator unic (hostname, fingerprint, etc.) */
  id: string;
  /** Data colectării */
  collectedAt: string; // ISO8601
  /** Informații hardware */
  hardware: {
    cpu: string;
    cores: number;
    ram_gb: number;
    disk_gb: number;
    disks: Array<{ mount: string; size_gb: number; used_gb: number }>;
  };
  /** Sistem de operare */
  os: {
    name: string;
    version: string;
    kernel: string;
    arch: string;
  };
  /** Utilizatori */
  users: Array<{ username: string; uid: number; shell: string; home: string }>;
  /** Servicii active - EXPANDED in FULL mode */
  services: Array<{ name: string; status: 'active' | 'inactive' | 'failed'; port?: number }>;
  /** Rețea */
  network: {
    hostname: string;
    public_ip?: string; // Redactat dacă privacy.redact_public_ip=true
    interfaces: Array<{ name: string; ip: string; mac: string }>;
    routing?: Array<{ destination: string; gateway: string; iface: string }>;
    dns?: string[];
    open_connections?: number;
    listening_ports?: Array<{ port: number; protocol: string; service: string }>;
  };
  /** FULL MODE ONLY - Securitate */
  security?: {
    firewall_status: string;
    firewall_enabled: boolean;
    ssh_port: number;
    ssh_root_login: boolean;
    selinux_status?: string;
    failed_services: string[];
  };
  /** FULL MODE ONLY - Performance actual (live) */
  performance?: {
    cpu_usage_percent: number;
    memory_usage_percent: number;
    memory_used_gb: number;
    memory_available_gb: number;
    load_average: { one: number; five: number; fifteen: number };
    uptime_seconds: number;
    process_count: number;
    process_count_by_user: { [user: string]: number };
    disk_io?: string;
  };
  /** FULL MODE ONLY - Storage detaliat */
  storage?: {
    inode_usage: Array<{ mount: string; used_percent: number; available_percent: number }>;
    filesystem_types: { [mount: string]: string };
  };
  /** FULL MODE ONLY - Kernel & Boot */
  kernel_info?: {
    kernel_version: string;
    boot_time: string;
    systemd_version?: string;
    uptime?: string;
    load_average?: number[];
  };
  /** FULL MODE ONLY - Updates pending */
  pending_updates?: {
    security_count: number;
    total_count: number;
    last_update: string;
  };
  /** FULL MODE ONLY - Recent alerts */
  recent_alerts?: {
    error_count_1h: number;
    failed_services: string[];
    failed_login_count_1h: number;
    last_error?: string;
  };
  /** Alte detalii */
  tags?: string[];
  notes?: string;
}

/**
 * Intrare de audit pentru acțiuni pe server
 */
export interface ActionLogEntry {
  /** Data și ora acțiunii */
  timestamp: string; // ISO8601
  /** Utilizatorul care a inițiat acțiunea */
  user: string;
  /** Serverul pe care s-a executat acțiunea */
  host: string;
  /** Tipul acțiunii (ex: exec, file, ssh, tool) */
  action: string;
  /** Detalii suplimentare (ex: comanda, fișier, parametri) */
  details: string;
  /** Status: succes, eroare, etc. */
  status: 'success' | 'error' | 'warning';
  /** Mesaj de eroare, dacă există */
  error?: string;
}

/**
 * Limite și moduri de eroare (documentație)
 * - Dimensiune maximă profil: vezi config.yaml (cli.profile.max_versions_per_host, max_age_days)
 * - Dimensiune maximă audit: vezi config.yaml (cli.audit.max_file_size_mb, max_files_per_host)
 * - Erori posibile: lipsă permisiuni, date incomplete, depășire limită, format invalid
 * - Redactare: câmpurile sensibile pot fi eliminate conform privacy.* din config
 */

/**
 * Exemplu de profil server
 */
export const EXAMPLE_PROFILE: ServerProfile = {
  id: 'server-01',
  collectedAt: '2025-10-17T19:50:00Z',
  hardware: {
    cpu: 'Intel Xeon E5-2670',
    cores: 16,
    ram_gb: 64,
    disk_gb: 2000,
    disks: [
      { mount: '/', size_gb: 500, used_gb: 120 },
      { mount: '/data', size_gb: 1500, used_gb: 800 }
    ]
  },
  os: {
    name: 'Ubuntu',
    version: '22.04',
    kernel: '5.15.0-86-generic',
    arch: 'x86_64'
  },
  users: [
    { username: 'root', uid: 0, shell: '/bin/bash', home: '/root' },
    { username: 'adrian', uid: 1000, shell: '/bin/bash', home: '/home/adrian' }
  ],
  services: [
    { name: 'sshd', status: 'active', port: 22 },
    { name: 'nginx', status: 'active', port: 80 },
    { name: 'mysql', status: 'inactive' }
  ],
  network: {
    hostname: 'server-01',
    public_ip: '89.123.45.67',
    interfaces: [
      { name: 'eth0', ip: '192.168.1.10', mac: '00:11:22:33:44:55' },
      { name: 'eth1', ip: '10.0.0.5', mac: '00:11:22:33:44:66' }
    ]
  },
  tags: ['production', 'web'],
  notes: 'Server principal web'
};

/**
 * Exemplu de intrare audit
 */
export const EXAMPLE_AUDIT: ActionLogEntry = {
  timestamp: '2025-10-17T19:51:00Z',
  user: 'adrian',
  host: 'server-01',
  action: 'exec',
  details: 'ssh server-01 "systemctl restart nginx"',
  status: 'success',
  error: undefined
};
