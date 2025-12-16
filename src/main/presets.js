function loadDFA() {
	var dfaLatex = `\\begin{center}
\\begin{tikzpicture}[scale=0.2]
\\tikzstyle{every node}+=[inner sep=0pt]
\\draw [black] (22.9,-33.2) circle (3);
\\draw (22.9,-33.2) node {$S$};
\\draw [black] (22.9,-33.2) circle (2.4);
\\draw [black] (39.1,-33.2) circle (3);
\\draw (39.1,-33.2) node {$A$};
\\draw [black] (56.2,-32.6) circle (3);
\\draw (56.2,-32.6) node {$B$};
\\draw [black] (24.746,-35.55) arc (65.88562:-222.11438:2.25);
\\draw (24.89,-40.39) node [below] {$0$};
\\fill [black] (22.16,-36.09) -- (21.37,-36.62) -- (22.29,-37.03);
\\draw [black] (53.2,-32.71) -- (42.1,-33.09);
\\fill [black] (42.1,-33.09) -- (42.92,-33.57) -- (42.88,-32.57);
\\draw (47.62,-32.37) node [above] {$1$};
\\draw [black] (55.297,-35.445) arc (-27.51778:-148.46311:8.68);
\\fill [black] (55.3,-35.45) -- (54.48,-35.92) -- (55.37,-36.39);
\\draw (47.93,-40.64) node [below] {$0$};
\\draw [black] (40.776,-30.727) arc (136.93615:47.08296:9.619);
\\fill [black] (40.78,-30.73) -- (41.69,-30.48) -- (40.96,-29.8);
\\draw (47.44,-27.15) node [above] {$0$};
\\draw [black] (36.417,-34.531) arc (-69.23342:-110.76658:15.278);
\\fill [black] (36.42,-34.53) -- (35.49,-34.35) -- (35.85,-35.28);
\\draw (31,-36.02) node [below] {$1$};
\\draw [black] (25.721,-32.187) arc (105.43088:74.56912:19.842);
\\fill [black] (25.72,-32.19) -- (26.62,-32.46) -- (26.36,-31.49);
\\draw (31,-30.97) node [above] {$1$};
\\draw [black] (16.6,-17.5) -- (21.78,-30.42);
\\fill [black] (21.78,-30.42) -- (21.95,-29.49) -- (21.02,-29.86);
\\end{tikzpicture}
\\end{center}`;

	try {
		var result = importFromLaTeX(dfaLatex);
		
		// Clear existing canvas
		nodes = [];
		links = [];
		selectedObject = null;
		
		// Populate with imported data
		nodes = result.nodes;
		links = result.links;
		
		// Ensure directed is on
		directed = true;
		var checkbox = document.getElementById('directedLinksCheckbox');
		if (checkbox) checkbox.checked = true;

		// Redraw and save
		draw();
		saveBackup();
	} catch (e) {
		alert('Error loading DFA preset: ' + e.message);
	}
}

function loadMSTExample() {
	var mstLatex = `\\begin{center}
\\begin{tikzpicture}[scale=0.2]
\\tikzstyle{every node}+=[inner sep=0pt]
\\draw [black] (19.9,-14.1) circle (3);
\\draw (19.9,-14.1) node {$A$};
\\draw [black] (36.3,-4.4) circle (3);
\\draw (36.3,-4.4) node {$B$};
\\draw [black] (61.2,-8.4) circle (3);
\\draw (61.2,-8.4) node {$C$};
\\draw [black] (9.4,-29.3) circle (3);
\\draw (9.4,-29.3) node {$D$};
\\draw [black] (21,-45.8) circle (3);
\\draw (21,-45.8) node {$E$};
\\draw [black] (60.2,-45.1) circle (3);
\\draw (60.2,-45.1) node {$F$};
\\draw [black] (67.7,-28.2) circle (3);
\\draw (67.7,-28.2) node {$G$};
\\draw [black] (59.566,-10.916) arc (-33.79569:-60.33727:106.92);
\\draw (44.56,-30.21) node [below] {$2$};
\\draw [black] (65.31,-26.39) -- (38.69,-6.21);
\\draw (53,-15.8) node [above] {$3$};
\\draw [black] (58.458,-9.617) arc (-67.28974:-96.99425:70.08);
\\draw (41.31,-14.99) node [below] {$4$};
\\draw [black] (65.312,-30.016) arc (-53.79331:-84.90648:82.324);
\\draw (46.65,-41.15) node [below] {$6$};
\\draw [black] (61.42,-42.36) -- (66.48,-30.94);
\\draw (64.68,-37.64) node [right] {$7$};
\\draw [black] (24,-45.75) -- (57.2,-45.15);
\\draw (40.61,-45.97) node [below] {$8$};
\\draw [black] (66.76,-25.35) -- (62.14,-11.25);
\\draw (65.22,-17.61) node [right] {$9$};
\\draw [black] (11.11,-26.83) -- (18.19,-16.57);
\\draw (15.25,-23.06) node [right] {$2$};
\\draw [black] (20,-17.1) -- (20.9,-42.8);
\\draw (19.9,-29.96) node [left] {$1$};
\\draw [black] (11.13,-31.75) -- (19.27,-43.35);
\\draw (14.61,-38.92) node [left] {$3$};
\\draw [black] (22.48,-12.57) -- (33.72,-5.93);
\\draw (29.1,-9.75) node [below] {$4$};
\\draw [black] (39.26,-4.88) -- (58.24,-7.92);
\\draw (48.34,-6.99) node [below] {$6$};
\\end{tikzpicture}
\\end{center}`;

	try {
		var result = importFromLaTeX(mstLatex);
		
		// Clear existing canvas
		nodes = [];
		links = [];
		selectedObject = null;
		
		// Populate with imported data
		nodes = result.nodes;
		links = result.links;
		
		// Ensure directed is off for MST example usually, but let's keep it consistent or as needed.
		// The example looks like an undirected graph (lines instead of arrows in tikz, though importFromLaTeX handles arrows).
		// The TikZ code uses \draw without ->, so it's undirected.
		directed = false;
		var checkbox = document.getElementById('directedLinksCheckbox');
		if (checkbox) checkbox.checked = false;

		// Redraw and save
		draw();
		saveBackup();
	} catch (e) {
		alert('Error loading MST preset: ' + e.message);
	}
}