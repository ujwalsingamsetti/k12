"""Curriculum Knowledge Base Module for K12 Textbook Ingestion into Qdrant Vector DB.

Extracts semantic textbook chunks from existing PDF textbooks, marking schemes,
and comprehensive NCERT curriculum modules across Science, Mathematics, Physics,
Computer Science, and Chemistry.
"""

import os
import uuid
from typing import List, Dict, Any
from loguru import logger

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None


def _chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> List[str]:
    """Split text into overlapping semantic chunks with sentence/paragraph boundary awareness."""
    text = text.strip()
    if not text:
        return []

    # Clean redundant whitespaces
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    cleaned_text = " ".join(lines)

    if len(cleaned_text) <= chunk_size:
        return [cleaned_text]

    chunks: List[str] = []
    start = 0
    text_len = len(cleaned_text)

    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = cleaned_text[start:end]

        # Try to break at a period, question mark, or space
        if end < text_len:
            last_punct = max(chunk.rfind(". "), chunk.rfind("? "), chunk.rfind("! "), chunk.rfind("; "))
            if last_punct > chunk_size // 2:
                end = start + last_punct + 1
                chunk = cleaned_text[start:end]
            else:
                last_space = chunk.rfind(" ")
                if last_space > chunk_size // 2:
                    end = start + last_space
                    chunk = cleaned_text[start:end]

        chunk_clean = chunk.strip()
        if len(chunk_clean) > 60:
            chunks.append(chunk_clean)

        start = end - overlap
        if start >= end:
            start = end

    return chunks


def _extract_pdf_chunks(
    pdf_path: str,
    subject: str,
    class_level: str,
    chapter_title: str,
    source_name: str
) -> List[Dict[str, Any]]:
    """Extract and chunk text from a PDF file using PyMuPDF."""
    if not fitz or not os.path.exists(pdf_path):
        return []

    chunks_data: List[Dict[str, Any]] = []
    try:
        doc = fitz.open(pdf_path)
        full_text = ""
        for page in doc:
            full_text += page.get_text() + "\n"
        doc.close()

        text_chunks = _chunk_text(full_text, chunk_size=850, overlap=150)
        for idx, tc in enumerate(text_chunks):
            chunks_data.append({
                "id": str(uuid.uuid4()),
                "text": tc,
                "subject": subject.lower(),
                "class_level": class_level.lower(),
                "chapter": chapter_title,
                "source": source_name,
                "chunk_index": idx
            })
    except Exception as e:
        logger.warning(f"Could not extract chunks from {pdf_path}: {e}")

    return chunks_data


# ─────────────────────────────────────────────────────────────
# Core NCERT Curriculum Modules (High-yield reference concepts)
# ─────────────────────────────────────────────────────────────

NCERT_CURRICULUM_MODULES: List[Dict[str, Any]] = [
    # ── CLASS 10 SCIENCE: Chemical Reactions and Equations ──
    {
        "subject": "science",
        "class_level": "class 10",
        "chapter": "Chapter 1: Chemical Reactions and Equations",
        "source": "NCERT Class 10 Science Chapter 1",
        "text": (
            "Chemical Reactions and Equations: A chemical reaction is a process where reactants transform into products "
            "with distinct chemical identities. Evidence of chemical change includes change in state, change in colour, "
            "evolution of gas, or change in temperature. "
            "Oxidation of Copper: When copper metal (shiny brown coloured element 'X') is heated in air, it reacts with "
            "atmospheric oxygen to form Copper(II) oxide (CuO), which is a black coloured substance. "
            "The balanced chemical equation is: 2Cu(s) + O2(g) --(heat)--> 2CuO(s). "
            "If hydrogen gas is passed over heated CuO, black CuO is reduced back to brown copper: CuO + H2 -> Cu + H2O. "
            "This is a classic redox reaction where copper oxide loses oxygen (reduction) and hydrogen gains oxygen (oxidation)."
        )
    },
    {
        "subject": "science",
        "class_level": "class 10",
        "chapter": "Chapter 1: Chemical Reactions and Equations",
        "source": "NCERT Class 10 Science Chapter 1",
        "text": (
            "Types of Chemical Reactions: "
            "1. Combination Reaction: Two or more reactants combine to form a single product. Example: CaO(s) + H2O(l) -> Ca(OH)2(aq) (Slaking of lime, highly exothermic). "
            "2. Decomposition Reaction: A single reactant breaks down to give simpler products upon heating (thermal), light (photochemical), or electricity (electrolytic). "
            "Thermal Decomposition of Ferrous Sulphate: When green ferrous sulphate crystals (FeSO4.7H2O) are heated, water of crystallisation is lost and the color changes. "
            "On further heating, 2FeSO4(s) --(heat)--> Fe2O3(s) + SO2(g) + SO3(g). "
            "Ferric oxide (Fe2O3) is a reddish-brown solid, while sulphur dioxide (SO2) and sulphur trioxide (SO3) are toxic gases with the characteristic suffocating odour of burning sulphur. "
            "3. Displacement Reaction: A more reactive element displaces a less reactive element from its compound. Example: Fe(s) + CuSO4(aq) -> FeSO4(aq) + Cu(s). "
            "4. Double Displacement Reaction: Precipitation and neutralisation reactions involving exchange of ions between reactants. Example: Na2SO4(aq) + BaCl2(aq) -> BaSO4(s) (white ppt) + 2NaCl(aq)."
        )
    },
    {
        "subject": "science",
        "class_level": "class 10",
        "chapter": "Chapter 2: Acids, Bases and Salts",
        "source": "NCERT Class 10 Science Chapter 2",
        "text": (
            "Acids, Bases and Salts: "
            "Neutralisation Reaction: The reaction between an acid and a base to produce salt and water is called a neutralisation reaction. "
            "General formulation: Acid + Base -> Salt + Water. "
            "Example: Hydrochloric acid reacts with sodium hydroxide to form sodium chloride and water: HCl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l). "
            "In ionic terms, H+(aq) from the acid combines with OH-(aq) from the base to produce H2O(l). "
            "pH Scale: Measures hydronium ion concentration. Neutral solutions have pH = 7. Acidic solutions have pH < 7 (higher H+ concentration). Basic solutions have pH > 7 (higher OH- concentration). "
            "Salts: Common salt (NaCl) is raw material for caustic soda (NaOH), bleaching powder (CaOCl2), baking soda (NaHCO3, sodium hydrogen carbonate), and washing soda (Na2CO3.10H2O). "
            "Plaster of Paris: CaSO4.1/2H2O obtained by heating gypsum (CaSO4.2H2O) at 373 K."
        )
    },
    {
        "subject": "science",
        "class_level": "class 10",
        "chapter": "Chapter 3: Metals and Non-Metals",
        "source": "NCERT Class 10 Science Chapter 3",
        "text": (
            "Metals and Non-Metals: "
            "Reactivity Series: Arrangement of metals in order of decreasing chemical reactivity: K > Na > Ca > Mg > Al > Zn > Fe > Pb > [H] > Cu > Hg > Ag > Au. "
            "Metals above hydrogen displace hydrogen gas from dilute acids (e.g., Zn + H2SO4 -> ZnSO4 + H2). "
            "Ionic Bonding: Formed by complete transfer of electrons from a metal atom (forming cation) to a non-metal atom (forming anion). "
            "Properties of Ionic Compounds: High melting and boiling points due to strong electrostatic attraction between oppositely charged ions; hard and brittle; conduct electricity in molten state or aqueous solution, but not in solid state."
        )
    },
    {
        "subject": "science",
        "class_level": "class 10",
        "chapter": "Chapter 6: Life Processes",
        "source": "NCERT Class 10 Science Chapter 6",
        "text": (
            "Life Processes: Nutrition, Respiration, Transportation, and Excretion. "
            "Autotrophic Nutrition: Green plants perform photosynthesis: 6CO2 + 12H2O --(chlorophyll, sunlight)--> C6H12O6 + 6O2 + 6H2O. "
            "Respiration: Glucose (6-carbon) breaks down in cytoplasm to pyruvate (3-carbon). In aerobic respiration (mitochondria), pyruvate breaks down to CO2 + H2O + 38 ATP. "
            "In anaerobic respiration in human muscle cells during heavy exercise, lack of oxygen leads to formation of lactic acid (3-carbon) + energy, causing muscular cramps. "
            "Human Excretion: Nephron is structural and functional unit of kidney. Performs ultrafiltration in Bowman's capsule, selective reabsorption of glucose, amino acids, salts in tubule, and tubular secretion."
        )
    },
    {
        "subject": "science",
        "class_level": "class 10",
        "chapter": "Chapter 10: Light - Reflection and Refraction",
        "source": "NCERT Class 10 Science Chapter 10",
        "text": (
            "Light - Reflection and Refraction: "
            "Mirror Formula: 1/f = 1/v + 1/u, where f is focal length, v is image distance, u is object distance. Magnification m = -v/u = h'/h. "
            "Refraction: Bending of light when passing obliquely from one medium to another. Snell's Law: sin(i) / sin(r) = n21 = constant (refractive index). "
            "Refractive index n = c / v. When light travels from an optically denser medium to a rarer medium, it bends away from the normal and speed increases. "
            "Lens Formula: 1/f = 1/v - 1/u. Magnification m = v/u = h'/h. Power of a lens P = 1 / f (in metres), measured in Dioptres (D). Convex lens has positive power, concave lens has negative power."
        )
    },
    {
        "subject": "science",
        "class_level": "class 10",
        "chapter": "Chapter 12: Electricity",
        "source": "NCERT Class 10 Science Chapter 12",
        "text": (
            "Electricity: "
            "Ohm's Law: The electric current (I) flowing through a conductor is directly proportional to the potential difference (V) across its ends, provided temperature remains constant: V = IR. "
            "Resistance R depends on length (l), cross-sectional area (A), and material resistivity (rho): R = rho * (l / A). "
            "Resistors in Series: Equivalent resistance Rs = R1 + R2 + R3. Current remains same through all resistors. "
            "Resistors in Parallel: 1/Rp = 1/R1 + 1/R2 + 1/R3. Potential difference remains same across each branch. "
            "Joule's Law of Heating: Heat produced H = I^2 * R * t = V * I * t = (V^2 / R) * t. Electric power P = V * I = I^2 * R = V^2 / R."
        )
    },

    # ── CLASS 10 MATHEMATICS: Geometry, Circles & Algebra ──
    {
        "subject": "mathematics",
        "class_level": "class 10",
        "chapter": "Chapter 10: Circles and Tangents",
        "source": "NCERT Class 10 Mathematics Chapter 10",
        "text": (
            "Circles and Tangents: "
            "A tangent to a circle is a straight line that touches the circle at exactly one point, known as the point of contact. "
            "Theorem 10.1: The tangent at any point of a circle is perpendicular to the radius through the point of contact. (OP is perpendicular to tangent AB at P). "
            "Tangent Length from Point: For a right triangle OTP with circle radius r = OT, centre O, external point P, and tangent PT: PT = sqrt(OP^2 - OT^2). "
            "Theorem 10.2: The lengths of tangents drawn from an external point to a circle are equal. "
            "Proof of Theorem 10.2: Given circle with centre O and tangents PQ, PR from external point P. Join OP, OQ, OR. "
            "In right triangles OQP and ORP: angle OQP = angle ORP = 90 deg (radius perpendicular to tangent); OQ = OR (radii of same circle); OP = OP (common hypotenuse). "
            "By RHS congruence criterion, triangle OQP is congruent to triangle ORP. "
            "Therefore, PQ = PR (Corresponding Parts of Congruent Triangles - CPCT). Hence Proved. "
            "Tangents at diameter ends: Let AB be diameter. Tangents at A and B make angles of 90 deg with AB. Sum of interior angles = 90 + 90 = 180 deg, proving tangents are parallel."
        )
    },
    {
        "subject": "mathematics",
        "class_level": "class 10",
        "chapter": "Chapter 6: Triangles",
        "source": "NCERT Class 10 Mathematics Chapter 6",
        "text": (
            "Triangles and Similarity: "
            "Two triangles are similar if their corresponding angles are equal and corresponding sides are proportional. "
            "Basic Proportionality Theorem (Thales Theorem): If a line is drawn parallel to one side of a triangle to intersect the other two sides in distinct points, "
            "the other two sides are divided in the same ratio: AD/DB = AE/EC. "
            "Criteria for Similarity: "
            "1. AAA (or AA) Similarity Criterion: If two angles of one triangle are respectively equal to two angles of another, the triangles are similar. "
            "2. SAS Similarity Criterion: One angle equal and including sides proportional. "
            "3. SSS Similarity Criterion: All three pairs of sides in the same ratio."
        )
    },
    {
        "subject": "mathematics",
        "class_level": "class 10",
        "chapter": "Chapter 3: Linear Equations & Chapter 4: Quadratic Equations",
        "source": "NCERT Class 10 Mathematics Chapters 3 & 4",
        "text": (
            "Algebra - Linear and Quadratic Equations: "
            "Pair of Linear Equations: a1*x + b1*y + c1 = 0 and a2*x + b2*y + c2 = 0. "
            "Consistency Conditions: "
            "- Unique Solution (Intersecting lines): a1/a2 != b1/b2. Consistent. "
            "- Infinitely Many Solutions (Coincident lines): a1/a2 = b1/b2 = c1/c2. Consistent. "
            "- No Solution (Parallel lines): a1/a2 = b1/b2 != c1/c2. Inconsistent. "
            "Quadratic Equations: ax^2 + bx + c = 0 (a != 0). Quadratic formula x = (-b +- sqrt(b^2 - 4ac)) / (2a). "
            "Discriminant D = b^2 - 4ac determines nature of roots: D > 0 gives two distinct real roots; D = 0 gives two equal real roots (-b/2a); D < 0 gives no real roots."
        )
    },

    # ── CLASS 12 PHYSICS: Electrostatics, Gauss's Law, Current, Magnetism ──
    {
        "subject": "physics",
        "class_level": "class 12",
        "chapter": "Chapter 1: Electric Charges and Fields",
        "source": "NCERT Class 12 Physics Chapter 1",
        "text": (
            "Electric Charges and Fields: "
            "Coulomb's Law: Electrostatic force between two point charges q1, q2 separated by distance r in vacuum: "
            "F = (1 / (4 * pi * epsilon_0)) * (|q1 * q2| / r^2), where epsilon_0 = 8.854 x 10^-12 C^2 N^-1 m^-2. "
            "Electric Field: Force per unit positive charge E = F / q0. Field of a point charge E = (1 / (4 * pi * epsilon_0)) * (q / r^2) r_hat. "
            "Electric Dipole: Pair of equal and opposite charges separated by distance 2a. Dipole moment p = q * (2a) directed from -q to +q. "
            "Torque on dipole in uniform field: tau = p x E = p * E * sin(theta). Potential energy U = -p . E = -p * E * cos(theta). "
            "Electric Flux: Total number of electric field lines passing through a surface: Phi = oint E . dA. "
            "Gauss's Law: The total electric flux through any closed surface is equal to 1/epsilon_0 times the net charge enclosed by the surface: "
            "oint E . dA = q_enclosed / epsilon_0. "
            "Applications of Gauss's Law: "
            "1. Field due to infinitely long straight uniformly charged wire with linear charge density lambda: E = lambda / (2 * pi * epsilon_0 * r). "
            "2. Field due to uniformly charged infinite plane sheet with surface charge density sigma: E = sigma / (2 * epsilon_0), independent of distance. "
            "3. Field due to uniformly charged thin spherical shell (radius R, charge q): Outside (r >= R), E = q / (4 * pi * epsilon_0 * r^2); Inside (r < R), E = 0."
        )
    },
    {
        "subject": "physics",
        "class_level": "class 12",
        "chapter": "Chapter 2: Electrostatic Potential and Capacitance",
        "source": "NCERT Class 12 Physics Chapter 2",
        "text": (
            "Electrostatic Potential and Capacitance: "
            "Electric Potential V: Work done in bringing unit positive charge from infinity to that point: V = q / (4 * pi * epsilon_0 * r). "
            "Relationship with Electric Field: E = -dV/dr (potential gradient). "
            "Equipotential Surface: A surface having same potential at all points. Electric field is always perpendicular to an equipotential surface. No work is done in moving charge along equipotential surface. "
            "Capacitance: Ratio of charge to potential C = Q / V. "
            "Parallel Plate Capacitor: In vacuum, C0 = (epsilon_0 * A) / d. When filled completely with dielectric of constant K, C = K * C0. "
            "Series Combination: 1/Cs = 1/C1 + 1/C2 + 1/C3 (charge Q is same). "
            "Parallel Combination: Cp = C1 + C2 + C3 (voltage V is same). "
            "Energy Stored in Capacitor: U = (1/2) * C * V^2 = (1/2) * Q * V = Q^2 / (2 * C). Energy density u = (1/2) * epsilon_0 * E^2."
        )
    },
    {
        "subject": "physics",
        "class_level": "class 12",
        "chapter": "Chapter 3: Current Electricity",
        "source": "NCERT Class 12 Physics Chapter 3",
        "text": (
            "Current Electricity: "
            "Drift Velocity vd: Average velocity with which conduction electrons drift opposite to applied electric field: vd = -(e * E * tau) / m. "
            "Relation between current and drift velocity: I = n * e * A * vd. "
            "Ohm's Law: V = IR, with resistance R = (m * l) / (n * e^2 * tau * A) = rho * (l / A). "
            "Kirchhoff's Laws: "
            "1. Kirchhoff's Current Law (Junction Rule): Algebraic sum of currents meeting at any junction is zero: sum(I) = 0. Based on conservation of charge. "
            "2. Kirchhoff's Voltage Law (Loop Rule): In any closed loop of an electric circuit, algebraic sum of changes in potential is zero: sum(Delta V) = 0. Based on conservation of energy. "
            "Wheatstone Bridge: Arrangement of four resistors P, Q, R, S in a bridge network. Condition for balance (zero galvanometer current Ig = 0) is P / Q = R / S."
        )
    },

    # ── CLASS 12 COMPUTER SCIENCE: Python Data Structures, Functions, SQL ──
    {
        "subject": "computer science",
        "class_level": "class 12",
        "chapter": "Chapter 1: Python Functions & Data Structures",
        "source": "NCERT Class 12 Computer Science Chapter 1",
        "text": (
            "Python Functions, Scope and Data Structures: "
            "Functions: Defined with 'def' keyword. Parameters can be positional, default, keyword, or variable-length. "
            "Scope: Follows LEGB rule (Local, Enclosing, Global, Built-in). Global variables can be modified inside functions using 'global' statement. "
            "Stack ADT: A linear data structure following Last-In First-Out (LIFO) order. Elements are added and removed from the same end called top. "
            "Stack Operations in Python: "
            "1. Push: Adds an element to the top of the stack. Implemented using list.append(item). "
            "2. Pop: Removes and returns the top element. Implemented using list.pop(). Must check for Stack Underflow condition if len(stack) == 0. "
            "3. Peek / Top: Returns the top element without removing it: stack[-1]. "
            "4. IsEmpty: Checks whether stack contains no items: len(stack) == 0. "
            "Stack Underflow occurs when attempting to pop or peek from an empty stack. "
            "Stack Overflow occurs in static arrays when pushing into a full stack (unbounded in Python dynamic lists unless maximum capacity is enforced)."
        )
    },
    {
        "subject": "computer science",
        "class_level": "class 12",
        "chapter": "Chapter 2: Relational Databases and SQL",
        "source": "NCERT Class 12 Computer Science Chapter 2",
        "text": (
            "Relational Database Management System and SQL: "
            "RDBMS Concepts: Relation (Table), Attribute (Column), Tuple (Row), Degree (number of columns), Cardinality (number of rows). "
            "Keys: Primary Key (unique, non-null identifier for a tuple), Candidate Key (minimal superkey capable of being primary key), Foreign Key (attribute referencing primary key of another table to establish referential integrity). "
            "SQL Commands: "
            "DDL (Data Definition Language): CREATE TABLE, ALTER TABLE, DROP TABLE. "
            "DML (Data Manipulation Language): SELECT, INSERT INTO, UPDATE, DELETE. "
            "Aggregate Functions: COUNT(), SUM(), AVG(), MIN(), MAX(). "
            "Clauses: WHERE (filters individual rows), GROUP BY (groups rows with same values in specified columns), HAVING (filters groups created by GROUP BY), ORDER BY (sorts ascending ASC or descending DESC)."
        )
    },

    # ── CLASS 12 CHEMISTRY: Coordination Compounds & VBT ──
    {
        "subject": "chemistry",
        "class_level": "class 12",
        "chapter": "Chapter 9: Coordination Compounds",
        "source": "NCERT Class 12 Chemistry Chapter 9",
        "text": (
            "Coordination Compounds and Werner's Theory: "
            "Coordination compounds contain a central metal atom or ion bonded to surrounding ligands through coordinate covalent bonds. "
            "Werner's Theory: Postulates that central metals in coordination compounds exhibit two types of valency: "
            "1. Primary Valency: Ionisable, satisfied by negative ions, corresponds to oxidation state of central metal. Non-directional. "
            "2. Secondary Valency: Non-ionisable, satisfied by neutral molecules or negative ions (ligands), corresponds to coordination number. Directional in space giving defined geometry (octahedral, tetrahedral, square planar). "
            "Example: In [Co(NH3)6]Cl3, primary valency is 3 (precipitates 3 moles of AgCl with AgNO3), secondary valency is 6 (six NH3 molecules coordinating Co3+). "
            "Ligands: Ions or molecules capable of donating electron pairs. "
            "Chelate Ligand: A di- or polydentate ligand that binds through two or more donor atoms to the same central ion, forming a stable ring structure (e.g., ethane-1,2-diamine 'en', oxalate 'ox', EDTA). Chelate complexes have enhanced thermodynamic stability called the chelate effect."
        )
    },
    {
        "subject": "chemistry",
        "class_level": "class 12",
        "chapter": "Chapter 9: Coordination Compounds - Valence Bond Theory",
        "source": "NCERT Class 12 Chemistry Chapter 9",
        "text": (
            "Valence Bond Theory (VBT) of Coordination Compounds: "
            "VBT explains hybridization, stereochemistry, and magnetic behaviour of coordination complexes through overlap of vacant metal hybrid orbitals with ligand donor orbitals. "
            "Octahedral Complexes (Coordination Number 6): "
            "1. Inner Orbital Complex (d2sp3): Uses inner (n-1)d orbitals (3d, 4s, 4p). Strong field ligands (e.g. CN-, NH3, CO) force pairing of 3d electrons, leading to low-spin diamagnetic complexes. "
            "Example: [Fe(CN)6]4- has Fe(II) with 3d6. CN- causes pairing, leaving 2 vacant 3d orbitals. Hybridization is d2sp3, geometry is octahedral, diamagnetic (zero unpaired electrons). "
            "2. Outer Orbital Complex (sp3d2): Uses outer nd orbitals (4s, 4p, 4d). Weak field ligands (e.g. H2O, F-, Cl-) cannot force pairing of electrons, leading to high-spin paramagnetic complexes. "
            "Example: [Fe(H2O)6]2+ has Fe(II) with 3d6. H2O is weak field ligand, no pairing occurs. Hybridization is sp3d2, geometry is octahedral, paramagnetic with 4 unpaired electrons (magnetic moment mu = sqrt(4*(4+2)) = 4.90 BM)."
        )
    }
]


def load_all_curriculum_textbook_chunks(base_dir: str = "/Users/ujwalsingamsetti/project-k12") -> List[Dict[str, Any]]:
    """Compile all textbook chunks from curriculum modules and disk PDF textbooks."""
    all_chunks: List[Dict[str, Any]] = []

    # 1. Add structured NCERT syllabus modules
    logger.info(f"Loading {len(NCERT_CURRICULUM_MODULES)} foundational NCERT curriculum modules...")
    for mod in NCERT_CURRICULUM_MODULES:
        # Generate semantic chunks for each module
        sub_chunks = _chunk_text(mod["text"], chunk_size=800, overlap=100)
        for idx, sc in enumerate(sub_chunks):
            all_chunks.append({
                "id": str(uuid.uuid4()),
                "text": sc,
                "subject": mod["subject"].lower(),
                "class_level": mod["class_level"].lower(),
                "chapter": mod["chapter"],
                "source": mod["source"],
                "chunk_index": idx
            })

    logger.info(f"Generated {len(all_chunks)} chunks from NCERT curriculum syllabus modules")

    # 2. Extract from existing PDF textbooks on disk
    textbook_dirs = [
        (os.path.join(base_dir, "k12-answer-evaluator/backend/data/textbooks/science"), "physics", "class 12", "NCERT Class 12 Physics"),
        (os.path.join(base_dir, "k12-answer-evaluator/backend/data/textbooks/mathematics"), "mathematics", "class 12", "NCERT Class 12 Mathematics"),
        (os.path.join(base_dir, "k12-answer-evaluator/backend/data/uploads/textbooks/12/physics"), "physics", "class 12", "NCERT Class 12 Physics Uploads"),
        (os.path.join(base_dir, "k12-answer-evaluator/backend/data/uploads/textbooks/8/english"), "english", "class 8", "NCERT Class 8 English"),
        (os.path.join(base_dir, "test_assets/marking_schemes"), "science", "class 10", "CBSE Official Marking Scheme Reference"),
    ]

    for dir_path, default_subj, default_lvl, default_src in textbook_dirs:
        if not os.path.exists(dir_path):
            continue

        for fname in sorted(os.listdir(dir_path)):
            if not fname.endswith(".pdf"):
                continue

            fpath = os.path.join(dir_path, fname)
            # Subject and level heuristics based on file name
            subj = default_subj
            lvl = default_lvl
            ch_title = f"{default_src} - {fname}"

            if "math" in fname.lower():
                subj = "mathematics"
            elif "chem" in fname.lower():
                subj = "chemistry"
            elif "cs" in fname.lower() or "computer" in fname.lower():
                subj = "computer science"
            elif "science" in fname.lower():
                subj = "science"

            if "10" in fname:
                lvl = "class 10"
            elif "12" in fname:
                lvl = "class 12"
            elif "8" in fname:
                lvl = "class 8"

            pdf_chunks = _extract_pdf_chunks(fpath, subj, lvl, ch_title, fname)
            logger.info(f"Extracted {len(pdf_chunks)} chunks from {fname} ({subj}, {lvl})")
            all_chunks.extend(pdf_chunks)

    logger.info(f"Total compiled textbook chunks across all subjects: {len(all_chunks)}")
    return all_chunks
