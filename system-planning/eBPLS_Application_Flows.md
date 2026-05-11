# eBPLS Application Process Flows

**Municipality of Liliw — All Scenarios**
**v2.0 — Updated with PayMongo Online Payment**

> Color key used across all diagrams:
> - 🔵 **Blue** — Applicant action
> - 🟣 **Purple** — BPLO Officer action
> - 🟢 **Green** — Barangay Officer action
> - 🟠 **Orange** — Treasury action
> - ⬜ **Gray** — Automated system action
> - 🔴 **Red** — Blocked / Failed state

---

## Scenario 1 — New Application (with Barangay Clearance Request)

> Applicant ticks the "Request Barangay Clearance" checkbox on the UAF.
> The system requests clearance from the Barangay before BPLO can approve.
> At payment, the applicant may choose OTC or online via PayMongo.

```mermaid
flowchart TD
    A([Start]) --> B[Register / Log in]
    B --> C[Fill out UAF Wizard]
    C --> D[Tick: Request Barangay Clearance\nUpload other required documents]
    D --> E[Submit Application]
    E --> F[[System creates:\nbrgy_clearances = Pending\ndoc_verifications = Awaiting Issuance]]

    F --> G[Barangay Officer reviews\nclearance request]
    G --> H{Decision}

    H -->|Approved| I[Barangay issues clearance\nclearance number + expiry set]
    I --> J[[System auto-updates\ndoc_verifications = Yes]]

    J --> K[BPLO Officer reviews\ndocuments + business data]
    K --> L{All checks pass?}
    L -->|Yes| M[[Application status: Verified\nRouted to Treasury]]

    L -->|No — issue found| N[BPLO returns application\nwith remarks]
    N --> O[Applicant receives\nReturn email]
    O --> P[Applicant corrects\nand resubmits]
    P --> K

    M --> Q[Treasury Officer\nassesses fees]
    Q --> R[Order of Payment generated\nApplicant receives TOP email]

    R --> PAY{Applicant chooses\npayment method}

    PAY -->|OTC| S[Cashier records OTC payment\nCash or Manager Check]
    S --> T[[System generates\nBusiness Permit + E-Resibo]]

    PAY -->|Online| S2[Applicant clicks Pay Online\nSystem creates Payment Intent]
    S2 --> S3[[Status: PaymentProcessing\nApplicant redirected to PayMongo]]
    S3 --> S4{PayMongo result}
    S4 -->|payment.paid webhook| S5[[Webhook verified\nSystem generates Permit + E-Resibo]]
    S4 -->|payment.failed webhook| S6[[Status reverts to ForPayment\nApplicant can retry]]
    S6 --> PAY

    T --> U[Applicant downloads\nPermit + E-Resibo]
    S5 --> U
    U --> V([Done])

    H -->|Rejected| W[Barangay rejects\nclearance with remarks]
    W --> X[[System auto-updates\ndoc_verifications = No]]
    X --> Y[Applicant receives\nRejection email with remarks]
    Y --> Z[Applicant resolves issue\nat Barangay Hall directly]
    Z --> G

    classDef applicant fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef bplo fill:#ede9fe,stroke:#7c3aed,color:#2e1065
    classDef barangay fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef treasury fill:#ffedd5,stroke:#ea580c,color:#7c2d12
    classDef system fill:#f1f5f9,stroke:#94a3b8,color:#334155
    classDef terminal fill:#f8fafc,stroke:#64748b,color:#0f172a
    classDef failed fill:#fee2e2,stroke:#dc2626,color:#7f1d1d

    class A,V terminal
    class B,C,D,E,P,U,Z,S2 applicant
    class G,I,W barangay
    class K,N bplo
    class Q,R,S treasury
    class F,J,M,T,X,Y,O,S3,S5,S6 system
    class S4 system
```

---

## Scenario 2 — New Application (Applicant has own Barangay Clearance)

> Applicant does NOT tick the checkbox — they already hold a valid Barangay Clearance
> and upload it themselves. BPLO manually verifies the uploaded document.
> At payment, the applicant may choose OTC or online via PayMongo.

```mermaid
flowchart TD
    A([Start]) --> B[Register / Log in]
    B --> C[Fill out UAF Wizard]
    C --> D[Upload own Barangay Clearance\nUpload other required documents]
    D --> E[Submit Application]
    E --> F[[System creates:\ndoc_verifications = Pending for Barangay row\nno brgy_clearances record created]]

    F --> G[BPLO Officer reviews all\nuploaded documents including\nthe Barangay Clearance]
    G --> H[BPLO reviews\nbusiness data accuracy]
    H --> I{All checks pass?}

    I -->|Yes| J[[Application status: Verified\nRouted to Treasury]]

    I -->|No — issue found| K[BPLO returns application\nwith remarks]
    K --> L[Applicant receives\nReturn email]
    L --> M[Applicant corrects\nand resubmits]
    M --> G

    J --> N[Treasury Officer\nassesses fees]
    N --> O[Order of Payment generated\nApplicant receives TOP email]

    O --> PAY{Applicant chooses\npayment method}

    PAY -->|OTC| P[Cashier records OTC payment\nCash or Manager Check]
    P --> Q[[System generates\nBusiness Permit + E-Resibo]]

    PAY -->|Online| P2[Applicant clicks Pay Online\nSystem creates Payment Intent]
    P2 --> P3[[Status: PaymentProcessing\nApplicant redirected to PayMongo]]
    P3 --> P4{PayMongo result}
    P4 -->|payment.paid webhook| P5[[Webhook verified\nSystem generates Permit + E-Resibo]]
    P4 -->|payment.failed webhook| P6[[Status reverts to ForPayment\nApplicant can retry]]
    P6 --> PAY

    Q --> R[Applicant downloads\nPermit + E-Resibo]
    P5 --> R
    R --> S([Done])

    classDef applicant fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef bplo fill:#ede9fe,stroke:#7c3aed,color:#2e1065
    classDef treasury fill:#ffedd5,stroke:#ea580c,color:#7c2d12
    classDef system fill:#f1f5f9,stroke:#94a3b8,color:#334155
    classDef terminal fill:#f8fafc,stroke:#64748b,color:#0f172a

    class A,S terminal
    class B,C,D,E,M,R,P2 applicant
    class G,H,K bplo
    class N,O,P treasury
    class F,J,Q,L,P3,P4,P5,P6 system
```

---

## Scenario 3 — Application Returned (BPLO Finds Issues)

> BPLO finds problems with either the uploaded documents or the declared business data.
> The application is returned to the applicant for correction.

```mermaid
flowchart TD
    A([Application submitted]) --> B[BPLO opens application\nstatus changes to Under Review]

    B --> C{Document check}
    C -->|Issue found| D[BPLO marks\ndoc_verifications = No]

    B --> E{Data review}
    E -->|Discrepancy found| F[BPLO marks data section\nas Discrepancy with remarks]

    D --> G[BPLO returns application\nwith remarks\nApprove button is blocked]
    F --> G

    G --> H[[Application status: Returned\nApplicant receives Return email]]
    H --> I[Applicant reads remarks\nand corrects the issue]

    I --> J{What needs fixing?}
    J -->|Document issue| K[Applicant re-uploads\ncorrected document]
    J -->|Data issue| L[Applicant corrects\nthe UAF data field]

    K --> M[Applicant resubmits\nApplication status: Pending]
    L --> M

    M --> N[Back in BPLO\nreview queue]
    N --> O{All checks pass\nthis time?}
    O -->|Yes| P[[Application status: Verified\nRouted to Treasury]]
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
    A([Clearance request submitted]) --> B[Barangay Officer\nreviews the request]
    B --> C{Decision}

    C -->|Rejected| D[Barangay Officer enters\nrejection remarks and confirms]
    D --> E[[System auto-updates:\nbrgy_clearances = Rejected\ndoc_verifications = No]]
    E --> F[Applicant receives Rejection email\nwith remarks included]

    F --> G[BPLO sees Barangay badge\nas Rejected\nApprove button is blocked]
    G --> H[Applicant reads\nrejection reason]

    H --> I{Can the applicant\nresolve the issue?}
    I -->|Yes| J[Applicant visits Barangay Hall\ndirectly and resolves concern]
    J --> K[Applicant requests\na new clearance review]
    K --> B

    I -->|No — cannot resolve| L[Application cannot proceed\nMust be abandoned or restarted]

    C -->|Issued| M[Barangay issues clearance]
    M --> N[[doc_verifications = Yes\nBPLO badge updates to Issued]]
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
> **Online payment is not available for retirement — OTC only.**

```mermaid
flowchart TD
    A([Start]) --> B[Applicant logs in\nto existing account]
    B --> C[Submit Retirement Request\nEnter reason + cessation date]
    C --> D[[System creates\nretirement_application record]]

    D --> E[BPLO Officer reviews\nretirement request]
    E --> F{Valid request?}
    F -->|No — incomplete| G[BPLO returns\nwith remarks]
    G --> H[Applicant corrects\nand resubmits]
    H --> E

    F -->|Yes| I[Treasury Officer computes\nfinal taxes based on\nfinal gross sales]
    I --> J[Order of Payment generated]
    J --> K[Cashier records OTC\nsettlement payment\nCash or Manager Check]

    K --> L[[System marks business as retired\nRetirement status: Complete]]
    L --> M[Applicant receives\nRetirement Complete email]
    M --> N[Applicant downloads\nRetirement documents]
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

## Scenario 6 — Online Payment via PayMongo (Happy Path) 🆕

> Applicant reaches ForPayment status and chooses to pay online instead of OTC.
> Payment is confirmed asynchronously via PayMongo's webhook callback.

```mermaid
flowchart TD
    A([Application: ForPayment]) --> B[Applicant opens Status Tracker\nSees total due + two payment options]

    B --> C[Applicant clicks\nPay Online via PayMongo]
    C --> D[Frontend calls\nPOST /api/treasury/payments/online]

    D --> E[[Backend creates Payment Intent\nvia PayMongo API\nTransactions row inserted with status = Pending\npaymongo_payment_intent_id stored]]

    E --> F[[Application status: PaymentProcessing\nAudit log: ONLINE_PAYMENT_INITIATED]]
    F --> G[Applicant redirected to\nPayMongo checkout page]

    G --> H[Applicant completes payment\nvia GCash or Card]
    H --> I[[PayMongo sends payment.paid\nwebhook to POST /api/webhooks/paymongo]]

    I --> J{Webhook handler:\nSignature valid?}
    J -->|No — invalid HMAC| K[[Reject 400\nLog incident\nNo state change]]

    J -->|Yes| L{Idempotency check:\nEvent ID already processed?}
    L -->|Yes — duplicate event| M[[Return 200 immediately\nNo further processing]]

    L -->|No — new event| N[[Insert into payment_gateway_logs\nprocessed = false]]
    N --> O[[Find transaction by\npaymongo_payment_intent_id\nUpdate: paymongo_payment_id\npayment_channel, paid_at]]

    O --> P[[Generate OR number\nPM-YYYYMMDD-000001]]
    P --> Q[[Transition application to Paid\nTrigger Permit + E-Resibo generation]]
    Q --> R[[Enqueue PAYMENT_RECORDED email\nUpdate payment_gateway_logs.processed = true\nAudit log: ONLINE_PAYMENT_CONFIRMED]]

    R --> S[Applicant's Status Tracker\nauto-updates to Completed]
    S --> T[Applicant downloads\nPermit + E-Resibo]
    T --> U([Done])

    classDef applicant fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef system fill:#f1f5f9,stroke:#94a3b8,color:#334155
    classDef terminal fill:#f8fafc,stroke:#64748b,color:#0f172a
    classDef blocked fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef webhook fill:#fef9c3,stroke:#ca8a04,color:#713f12

    class A,U terminal
    class B,C,H,T applicant
    class D,E,F,G,I,L,M,N,O,P,Q,R,S system
    class J webhook
    class K blocked
```

---

## Scenario 7 — Online Payment Failed or Abandoned 🆕

> Applicant initiates PayMongo checkout but either abandons the page or the payment fails.
> The system safely reverts to ForPayment so the applicant can retry.

```mermaid
flowchart TD
    A([Application: PaymentProcessing]) --> B[Applicant is on\nPayMongo checkout page]

    B --> C{What happens?}

    C -->|Applicant closes / abandons| D[PayMongo fires\npayment.failed webhook]
    C -->|Payment declined| D

    D --> E[[Webhook handler:\nSignature verified]]
    E --> F[[Update transactions.status = Failed\nTransition application back to ForPayment\nUpdate payment_gateway_logs.processed = true\nAudit log: ONLINE_PAYMENT_FAILED]]

    F --> G[Applicant's Status Tracker\npolling detects ForPayment status]
    G --> H[Applicant sees payment options again]

    H --> I{Applicant chooses retry method}
    I -->|Try online again| J[Applicant clicks\nPay Online via PayMongo]
    J --> K[[New Payment Intent created\nNew transactions row\nStatus back to PaymentProcessing]]
    K --> B

    I -->|Switch to OTC| L[Applicant visits municipal hall\nPays at cashier window]
    L --> M[Cashier records OTC payment\nOR number entered]
    M --> N[[Application transitions to Paid\nPermit + E-Resibo generated]]
    N --> O([Done])

    classDef applicant fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef treasury fill:#ffedd5,stroke:#ea580c,color:#7c2d12
    classDef system fill:#f1f5f9,stroke:#94a3b8,color:#334155
    classDef terminal fill:#f8fafc,stroke:#64748b,color:#0f172a
    classDef webhook fill:#fef9c3,stroke:#ca8a04,color:#713f12

    class A,O terminal
    class B,H,J,L applicant
    class M treasury
    class D,E,F,G,K,N system
    class C webhook
```

---

## Quick Reference — Who Does What

| Step | Actor | Action |
|---|---|---|
| Fill & submit UAF | **Applicant** | Completes wizard, uploads documents, submits |
| Request clearance | **Barangay Officer** | Reviews request, issues or rejects with remarks |
| Verify documents & data | **BPLO Officer** | Checks all docs + business data, approves or returns |
| Assess fees | **Treasury Officer** | Calculates fees, generates Order of Payment |
| Collect OTC payment | **Treasury Cashier** | Records cash or manager's check; enters OR number |
| **Initiate online payment** | **Applicant (or Treasury Officer)** | Clicks Pay Online; redirected to PayMongo checkout |
| **Confirm online payment** | **System (webhook)** | PayMongo fires webhook; backend verifies, records, and transitions status |
| Generate documents | **System (auto)** | Creates Permit, E-Resibo, TOP upon status change — triggered by both OTC and online payment |
| Download documents | **Applicant** | Downloads permit and receipt from their dashboard |

---

## Payment Channel Comparison

| Channel | Who Initiates | Path | OR Number Format | Confirmation |
|---|---|---|---|---|
| Cash (OTC) | Treasury Cashier | ForPayment → Paid | Manually entered by cashier | Synchronous (instant) |
| Manager Check (OTC) | Treasury Cashier | ForPayment → Paid | Manually entered by cashier | Synchronous (instant) |
| GCash (Online) | Applicant or Treasury | ForPayment → PaymentProcessing → Paid | `PM-{YYYYMMDD}-{seq}` | Asynchronous (webhook) |
| Card (Online) | Applicant or Treasury | ForPayment → PaymentProcessing → Paid | `PM-{YYYYMMDD}-{seq}` | Asynchronous (webhook) |
| PayMongo Link (Online) | Applicant or Treasury | ForPayment → PaymentProcessing → Paid | `PM-{YYYYMMDD}-{seq}` | Asynchronous (webhook) |

> **Retirement Module** uses OTC only. Online payment is not available for retirement settlements.

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
    FA --> AS([Assessed])
    AS --> FP([For Payment])
    FP --> PD([Paid])
    FP --> PP([Payment\nProcessing])
    PP --> PD
    PP --> FP
    PD --> C([Completed ✓])

    classDef done fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef active fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef warn fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef online fill:#f3e8ff,stroke:#9333ea,color:#3b0764

    class C done
    class D,P,UR,FA,AS,FP,PD active
    class R warn
    class PP online
```

> `PaymentProcessing` (purple) is entered only via the online payment path. It is an intermediate state between `ForPayment` and `Paid`. If payment fails, the application reverts to `ForPayment` for retry.

---

*eBPLS Application Flow Reference v2.0 — Municipality of Liliw*
*Updated: Added Scenario 6 (Online Payment Happy Path), Scenario 7 (Online Payment Failed/Abandoned), PaymentProcessing state in the lifecycle diagram, and payment channel comparison table.*