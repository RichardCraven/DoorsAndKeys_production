import re

file_path = "/Users/richardcraven/Documents/Projects/restack/restack_client/src/pages/DungeonPage.js"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Remember: lines are 0-indexed in Python, but 1-indexed in our viewer tool.
# Line 13524 is index 13523
# Line 13894 is index 13893
# Line 13929 is index 13928
# Line 14656 is index 14655

left_panel_replacement = """            <div className={`left-side-panel ${this.state.leftPanelExpanded ? 'expanded' : ''}`}>
                <div className="expand-collapse-button icon-container" onClick={this.toggleLeftSidePanel}>
                    <CIcon icon={cilCaretRight} className={`expand-icon ${this.state.leftPanelExpanded ? 'expanded' : ''}`} size="sm"/>
                </div>
                {this.state.selectedCrewMember && this.state.selectedCrewMember.name && (
                    <div className="crew-info-section" style={{ width: '100%' }}>
                        {this.renderPanelSections('left')}
                        <div className="description-panel">
                            {this.state.descriptionText}
                        </div>
                    </div>
                )}
            </div>
"""

right_panel_replacement = """            <div className={`right-side-panel ${this.state.rightPanelExpanded ? 'expanded' : ''}`}>
                {this.renderPanelSections('right')}
                <div className="expand-collapse-button icon-container" onClick={this.toggleRightSidePanel}>
                    <CIcon icon={cilCaretLeft} className={`expand-icon ${this.state.rightPanelExpanded ? 'expanded' : ''}`} size="sm"/>
                </div>
            </div>
"""

# Let's print out what is at those indexes to verify
print("LEFT PAN_START:", lines[13523].strip())
print("LEFT PAN_END:", lines[13893].strip())
print("RIGHT PAN_START:", lines[13928].strip())
print("RIGHT PAN_END:", lines[14655].strip())

new_lines = lines[:13523] + [left_panel_replacement] + lines[13894:13928] + [right_panel_replacement] + lines[14656:]

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Replacement complete successfully!")
