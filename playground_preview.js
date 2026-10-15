const template = /*html*/`
<li class="project-card">
    <details>
        <summary>
            <span>{{title}} </span>
        </summary>
        <div class="contain">
            <div class="links">
                <a href="./{{project}}">Project Page</a>
                <a href="https://github.com/johnarban/wwt-playground/tree/{{project}}" target="_blank">GitHub Repo</a>
            </div>
            <article class="intro">
                <slot>Enter your description in the slot</slot>
            </article>
            <iframe data-src="https://johnarban.github.io/wwt-playground/{{project}}">
                I frame failed to load. Click to <a href="./{{project}}">view the FITS example project</a>
            </iframe>
        </div>
    </details>
</li>
`

const style = /*css*/`

li.project-card {
	list-style-type: none;
	padding: var(--space);
	border-radius: var(--radius);
	background-color: var(--surface-color);
	display: block;
	
}

a {
	color: var(--text-color);
	text-decoration: none;
}
a:hover {
	text-decoration: dotted underline;
}

.links {
	display: flex;
	gap: var(--space);
	font-size: 0.9rem;
	opacity: 0.9;
}

.links a {
	padding: calc(var(--space) / 3) calc(var(--space) / 1.5);
	border: 1px solid var(--border-color);
	border-radius: var(--radius);
}

details {
	display: block;
	
}

summary {
	flex-grow: 0;
	padding: 4px var(--space);
	outline: 1px solid var(--border-color);
	border-radius: var(--radius);
	margin-bottom: 5px;
	user-select: none;
	cursor: pointer;
}

summary:hover {
	font-weight: bold;
}
summary > span {
	margin-left: calc(var(--space) / 2);
}

details[open] > .contain {
	display: flex;
	flex-direction: column;
	gap: var(--space);
}

.contain > iframe {
	width: 100%;
	height: 400px;
	display: block;
	border: 0;
}


article.intro {
	font-size: 0.8rem;
	
}
`

/** Vue inspired template interpolation using double curly braces
  * This regex is used for Vue-inspired template interpolation with double curly braces.
  * Explanation:
  * - \{\{ and \}\}: Match the opening and closing double curly braces.
  * - (): Capture group for the content inside the braces.
  * - [^{}]+: Match one or more characters that are not curly braces.
  * - g: Global flag to replace all matches in the string.
  * Example: For {{value}}, it captures "value".
  * This will not run js expressions within {{ ... }}.
**/
function format(template, values) {
    // breaks if there are spaces
    return template.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
        // trim to ignore spaces around the key
        return values[key.trim()] !== undefined ? values[key.trim()] : match;
    });
}


class WwtPreview extends HTMLElement {
    // these are attributes on the element (js can change them and it will work)
    static observedAttributes = ["project", "title"];
    constructor() {
        super();
        console.log('WwtPreview constructor called');
        this.attachShadow({mode: 'open'});
        // not allowed to set attributes in constructor
    }
    
    connectedCallback() {
        this.render();
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        this[name] = newValue;
        console.log(`Attribute changed: ${name} from ${oldValue} to ${newValue}`);
        this.render();
    }
    
    applyStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = style;
        this.shadowRoot.appendChild(styleElement);
    }

    // only keep the iframe loaded while the card is open (WWT is heavy)
    loadIframeWhileOpen() {
        const details = this.shadowRoot.querySelector('details');
        const iframe = this.shadowRoot.querySelector('iframe');
        details.addEventListener('toggle', () => {
            if (details.open) {
                iframe.src = iframe.dataset.src;
            } else {
                iframe.src = 'about:blank';
            }
        });
    }

    render() {
        console.log('Rendering WwtPreview with project:', this.project, 'and title:', this.title);
        const values = WwtPreview.observedAttributes.reduce((acc, attr) => {
            acc[attr] = this[attr]; 
            return acc;
        }
        , {});
        this.shadowRoot.innerHTML = format(template, values);
        this.applyStyles();
        this.loadIframeWhileOpen();
    }
}

customElements.define('wwt-preview', WwtPreview);