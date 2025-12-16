function loadDFA() {
	var dfaLatex = `\\begin{tikzpicture}[scale=0.2]
\\tikzstyle{every node}+=[inner sep=0pt]
\\draw [black] (19.5,-33.2) circle (3);
\\draw (19.5,-33.2) node {$0$};
\\draw [black] (19.5,-33.2) circle (2.4);
\\draw [black] (34.7,-33.2) circle (3);
\\draw (34.7,-33.2) node {$1$};
\\draw [black] (49,-33.2) circle (3);
\\draw (49,-33.2) node {$2$};
\\draw [black] (35.1,-12.5) circle (3);
\\draw (35.1,-12.5) node {$S$};
\\draw [black] (35.1,-12.5) circle (2.4);
\\draw [black] (12.4,-8.3) -- (32.15,-11.95);
\\fill [black] (32.15,-11.95) -- (31.45,-11.32) -- (31.27,-12.3);
\\draw [black] (33.29,-14.9) -- (21.31,-30.8);
\\fill [black] (21.31,-30.8) -- (22.19,-30.47) -- (21.39,-29.86);
\\draw (26.72,-21.45) node [left] {$0$};
\\draw [black] (21.346,-35.55) arc (65.88866:-222.11134:2.25);
\\draw (21.49,-40.39) node [below] {$0$};
\\fill [black] (18.76,-36.09) -- (17.97,-36.62) -- (18.89,-37.03);
\\draw [black] (48.406,-36.118) arc (-23.52727:-156.47273:7.15);
\\fill [black] (48.41,-36.12) -- (47.63,-36.65) -- (48.54,-37.05);
\\draw (41.85,-40.91) node [below] {$0$};
\\draw [black] (36.152,-30.598) arc (139.38397:40.61603:7.506);
\\fill [black] (36.15,-30.6) -- (37.05,-30.32) -- (36.29,-29.67);
\\draw (41.85,-27.48) node [above] {$0$};
\\draw [black] (35.04,-15.5) -- (34.76,-30.2);
\\fill [black] (34.76,-30.2) -- (35.27,-29.41) -- (34.27,-29.39);
\\draw (34.37,-22.85) node [left] {$1$};
\\draw [black] (46,-33.2) -- (37.7,-33.2);
\\fill [black] (37.7,-33.2) -- (38.5,-33.7) -- (38.5,-32.7);
\\draw (41.85,-32.7) node [above] {$1$};
\\draw [black] (32.049,-34.591) arc (-68.64701:-111.35299:13.591);
\\fill [black] (32.05,-34.59) -- (31.12,-34.42) -- (31.49,-35.35);
\\draw (27.1,-36.02) node [below] {$1$};
\\draw [black] (22.302,-32.139) arc (105.84423:74.15577:17.573);
\\fill [black] (22.3,-32.14) -- (23.21,-32.4) -- (22.94,-31.44);
\\draw (27.1,-30.97) node [above] {$1$};
\\end{tikzpicture}`;

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