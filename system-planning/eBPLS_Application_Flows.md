# eBPLS Application Process Flows

**Municipality of Liliw — All Scenarios**

> Color key used across all diagrams:
> - 🔵 **Blue** — Applicant action
> - 🟣 **Purple** — BPLO Officer action
> - 🟢 **Green** — Barangay Officer action
> - 🟠 **Orange** — Treasury action
> - ⬜ **Gray** — Automated system action

---

## Scenario 1 — New Application (with Barangay Clearance Request)

> Applicant ticks the "Request Barangay Clearance" checkbox on the UAF.
> The system requests clearance from     the Barangay before BPLO can approve.

```mermaid
flowchart TD
    A([Start]) --> B[Register / Log in]
    B --> C[Fill out UAF Wizard]
    C --> D[Tick: Request Barangay Clearance<br/>Upload other required documents]
    D --> E[Submit Application]
    E --> F[[System creates:<br/>brgy_clearances = Pending<br/>doc_verifications = Awaiting Issuance]]

    F --> G[Barangay Officer reviews<br/>clearance request]
    G --> H{Decision}

    H -->|Approved| I[Barangay issues clearance<br/>clearance number + expiry set]
    I --> J[[System auto-updates<br/>doc_verifications = Yes]]

    J --> K[BPLO Officer reviews<br/>documents + business data]
    K --> L{All checks pass?}
    L -->|Yes| M[[Application status: Verified<br/>Routed to Treasury]]

    L -->|No — issue found| N[BPLO returns application<br/>with remarks]
    N --> O[Applicant receives<br/>Return email]
    O --> P[Applicant corrects<br/>and resubmits]
    P --> K

    M --> Q[Treasury Officer<br/>assesses fees]
    Q --> R[Order of Payment generated<br/>Applicant receives TOP email]
    R --> S[Cashier records OTC payment<br/>Cash or Manager Check]
    S --> T[[System generates<br/>Business Permit + E-Resibo]]
    T --> U[Applicant downloads<br/>Permit + E-Resibo]
    U --> V([Done])

    H -->|Rejected| W[Barangay rejects<br/>clearance with remarks]
    W --> X[[System auto-updates<br/>doc_verifications = No]]
    X --> Y[Applicant receives<br/>Rejection email with remarks]
    Y --> Z[Applicant resolves issue<br/>at Barangay Hall directly]
    Z --> G

    classDef applicant fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef bplo fill:#ede9fe,stroke:#7c3aed,color:#2e1065
    classDef barangay fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef treasury fill:#ffedd5,stroke:#ea580c,color:#7c2d12
    classDef system fill:#f1f5f9,stroke:#94a3b8,color:#334155
    classDef terminal fill:#f8fafc,stroke:#64748b,color:#0f172a

    class A,V terminal
    class B,C,D,E,P,U,Z applicant
    class G,I,W barangay
    class K,N bplo
    class Q,R,S treasury
    class F,J,M,T,X,Y,O system
```

---

## Scenario 2 — New Application (Applicant has own Barangay Clearance)

> Applicant does NOT tick the checkbox — they already hold a valid Barangay Clearance
> and upload it themselves. BPLO manually verifies the uploaded document.

```mermaid
flowchart TD
    A([Start]) --> B[Register / Log in]
    B --> C[Fill out UAF Wizard]
    C --> D[Upload own Barangay Clearance<br/>Upload other required documents]
    D --> E[Submit Application]
    E --> F[[System creates:<br/>doc_verifications = Pending for Barangay row<br/>no brgy_clearances record created]]

    F --> G[BPLO Officer reviews all<br/>uploaded documents including<br/>the Barangay Clearance]
    G --> H[BPLO reviews<br/>business data accuracy]
    H --> I{All checks pass?}

    I -->|Yes| J[[Application status: Verified<br/>Routed to Treasury]]

    I -->|No — issue found| K[BPLO returns application<br/>with remarks]
    K --> L[Applicant receives<br/>Return email]
    L --> M[Applicant corrects<br/>and resubmits]
    M --> G

    J --> N[Treasury Officer<br/>assesses fees]
    N --> O[Order of Payment generated<br/>Applicant receives TOP email]
    O --> P[Cashier records OTC payment<br/>Cash or Manager Check]
    P --> Q[[System generates<br/>Business Permit + E-Resibo]]
    Q --> R[Applicant downloads<br/>Permit + E-Resibo]
    R --> S([Done])

    classDef applicant fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef bplo fill:#ede9fe,stroke:#7c3aed,color:#2e1065
    classDef treasury fill:#ffedd5,stroke:#ea580c,color:#7c2d12
    classDef system fill:#f1f5f9,stroke:#94a3b8,color:#334155
    classDef terminal fill:#f8fafc,stroke:#64748b,color:#0f172a

    class A,S terminal
    class B,C,D,E,M,R applicant
    class G,H,K bplo
    class N,O,P treasury
    class F,J,Q,L system
```

---

## Scenario 3 — Application Returned (BPLO Finds Issues)

> BPLO finds problems with either the uploaded documents or the declared business data.
> The application is returned to the applicant for correction.

```mermaid
flowchart TD
    A([Application submitted]) --> B[BPLO opens application<br/>status changes to Under Review]

    B --> C{Document check}
    C -->|Issue found| D[BPLO marks<br/>doc_verifications = No]

    B --> E{Data review}
    E -->|Discrepancy found| F[BPLO marks data section<br/>as Discrepancy with remarks]

    D --> G[BPLO returns application<br/>with remarks<br/>Approve button is blocked]
    F --> G

    G --> H[[Application status: Returned<br/>Applicant receives Return email]]
    H --> I[Applicant reads remarks<br/>and corrects the issue]

    I --> J{What needs fixing?}
    J -->|Document issue| K[Applicant re-uploads<br/>corrected document]
    J -->|Data issue| L[Applicant corrects<br/>the UAF data field]

    K --> M[Applicant resubmits<br/>Application status: Pending]
    L --> M

    M --> N[Back in BPLO<br/>review queue]
    N --> O{All checks pass<br/>this time?}
    O -->|Yes| P[[Application status: Verified<br/>Routed to Treasury]]
    O -->|No — new issue found| G

    P --> Q([Continues to Treasury →])

    classDef applicant fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef bplo fill:#ede9fe,stroke:#7c3aed,color:#2e1065
    classDef system fill:#f1f5f9,stroke:#94a3b8,color:#334155
    classDef terminal fill:#f8fafc,stroke:#64748b,color:#0f172a

    class A,Q terminal
    class I,K,L,M applicant
    class B,C,D,E,F,G,N,O bplo
    class H,P system
```

---

## Scenario 4 — Barangay Clearance Rejected

> Applicant requested a Barangay Clearance (checkbox ticked).
> The Barangay Officer reviews and rejects the request.
> BPLO is automatically blocked from approving the application.

```mermaid
flowchart TD
    A([Clearance request submitted]) --> B[Barangay Officer<br/>reviews the request]
    B --> C{Decision}

    C -->|Rejected| D[Barangay Officer enters<br/>rejection remarks and confirms]
    D --> E[[System auto-updates:<br/>brgy_clearances = Rejected<br/>doc_verifications = No]]
    E --> F[Applicant receives Rejection email<br/>with remarks included]

    F --> G[BPLO sees Barangay badge<br/>as Rejected<br/>Approve button is blocked]
    G --> H[Applicant reads<br/>rejection reason]

    H --> I{Can the applicant<br/>resolve the issue?}
    I -->|Yes| J[Applicant visits Barangay Hall<br/>directly and resolves concern]
    J --> K[Applicant requests<br/>a new clearance review]
    K --> B

    I -->|No — cannot resolve| L[Application cannot proceed<br/>Must be abandoned or restarted]

    C -->|Issued| M[Barangay issues clearance]
    M --> N[[doc_verifications = Yes<br/>BPLO badge updates to Issued]]
    N --> O([BPLO can now approve →])

    classDef applicant fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef bplo fill:#ede9fe,stroke:#7c3aed,color:#2e1065
    classDef barangay fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef system fill:#f1f5f9,stroke:#94a3b8,color:#334155
    classDef terminal fill:#f8fafc,stroke:#64748b,color:#0f172a
    classDef blocked fill:#fee2e2,stroke:#dc2626,color:#7f1d1d

    class A,O terminal
    class H,J,K applicant
    class G bplo
    class B,D,M barangay
    class E,F,N system
    class L blocked
```

---

## Scenario 5 — Business Retirement

> An existing business owner wants to formally close / retire their business.
> Uses a separate retirement flow but reuses the Treasury OTC payment step.

```mermaid
flowchart TD
    A([Start]) --> B[Applicant logs in<br/>to existing account]
    B --> C[Submit Retirement Request<br/>Enter reason + cessation date]
    C --> D[[System creates<br/>retirement_application record]]

    D --> E[BPLO Officer reviews<br/>retirement request]
    E --> F{Valid request?}
    F -->|No — incomplete| G[BPLO returns<br/>with remarks]
    G --> H[Applicant corrects<br/>and resubmits]
    H --> E

    F -->|Yes| I[Treasury Officer computes<br/>final taxes based on<br/>final gross sales]
    I --> J[Order of Payment generated]
    J --> K[Cashier records OTC<br/>settlement payment<br/>Cash or Manager Check]

    K --> L[[System marks business as retired<br/>Retirement status: Complete]]
    L --> M[Applicant receives<br/>Retirement Complete email]
    M --> N[Applicant downloads<br/>Retirement documents]
    N --> O([Done — Business is retired])

    classDef applicant fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef bplo fill:#ede9fe,stroke:#7c3aed,color:#2e1065
    classDef treasury fill:#ffedd5,stroke:#ea580c,color:#7c2d12
    classDef system fill:#f1f5f9,stroke:#94a3b8,color:#334155
    classDef terminal fill:#f8fafc,stroke:#64748b,color:#0f172a

    class A,O terminal
    class B,C,H,N applicant
    class E,F,G bplo
    class I,J,K treasury
    class D,L,M system
```

---

## Quick Reference — Who Does What

| Step | Actor | Action |
|---|---|---|
| Fill & submit UAF | **Applicant** | Completes wizard, uploads documents, submits |
| Request clearance | **Barangay Officer** | Reviews request, issues or rejects with remarks |
| Verify documents & data | **BPLO Officer** | Checks all docs + business data, approves or returns |
| Assess fees | **Treasury Officer** | Calculates fees, generates Order of Payment |
| Collect payment | **Treasury Cashier** | Records OTC cash or manager's check payment |
| Generate documents | **System (auto)** | Creates Permit, E-Resibo, TOP upon status change |
| Download documents | **Applicant** | Downloads permit and receipt from their dashboard |

---

## Application Status Lifecycle

```mermaid
flowchart LR
    D([Draft]) --> P([Pending])
    P --> UR([Under Review])
    UR --> V([Verified])
    UR --> R([Returned])
    R --> P
    V --> FA([For Assessment])
    FA --> A([Assessed])
    A --> FP([For Payment])
    FP --> PD([Paid])
    PD --> C([Completed ✓])

    classDef done fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef active fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef warn fill:#fef3c7,stroke:#d97706,color:#78350f

    class C done
    class D,P,UR,FA,A,FP,PD active
    class R warn
```

---

*eBPLS Application Flow Reference — Municipality of Liliw*
