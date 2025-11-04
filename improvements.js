        console.log('🚀 Improvements page loaded');

        // Get data from sessionStorage
        const data = sessionStorage.getItem('cvAnalysisResult');
        console.log('📦 SessionStorage data:', data ? 'FOUND!' : 'NOT FOUND!');

        if (!data) {
            console.error('❌ ERROR: No data in sessionStorage!');
            showError();
        } else {
            try {
                const result = JSON.parse(data);
                console.log('✅ Data parsed successfully');

                // Check if we have all content (old format) or need to lazy load (new format)
                if (result.coverLetter && result.recruiterTips && result.changesOverview) {
                    console.log('📦 Complete data found - using full display');
                    displayContent(result);
                } else {
                    console.log('⚡ Fast mode detected - lazy loading content');
                    displayContentLazy(result);
                }
            } catch (error) {
                console.error('❌ Error parsing data:', error);
                showError();
            }
        }

        function showError() {
            document.body.innerHTML = `
                <div class="container mx-auto px-4 py-16 text-center">
                    <div class="text-8xl mb-6">⚠️</div>
                    <h1 class="text-4xl font-bold text-red-600 mb-4" data-i18n="no-data-title">No Data Found</h1>
                    <p class="text-gray-600 mb-8 text-lg" data-i18n="no-data">No CV analysis data available.</p>
                    <button onclick="window.location.href='index.html'"
                            class="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-4 rounded-xl font-semibold shadow-lg transition-all hover:scale-105"
                            data-i18n="back-to-home">
                        🏠 Back to Home
                    </button>
                </div>
            `;
        }

        function displayContent(result) {
            console.log('📝 Displaying content...');

            // Get the full text for analysis
            const fullText = [
                result.changesOverview || '',
                result.improvedCV || '',
                result.coverLetter || '',
                result.recruiterTips || ''
            ].join('\n\n');

            console.log('📏 Text length:', fullText.length);

            // Extract stats with SMART calculation
            const stats = extractStats(fullText, result);
            console.log('📊 Extracted stats:', stats);

            // Update UI
            updateStats(stats.matchScore, stats.changesCount);

            // Update rate limit display
            updateRateLimitDisplay(result.rateLimit);

            // Render all content with beautiful formatting
            renderChangesContent(result.changesOverview);
            renderCVContent(result.improvedCV);
            renderMarkdownContent('coverLetter', result.coverLetter);
            renderRecruiterTipsChecklist(result.recruiterTips);

            console.log('🎉 ALL DONE!');
        }

        // LAZY LOADING: Display CV immediately, load rest in background
        async function displayContentLazy(result) {
            console.log('⚡ Starting lazy content loading...');

            // 1. Display CV immediately (already loaded)
            console.log('📄 Rendering CV (already available)...');
            renderCVContent(result.improvedCV);

            // 2. Show skeleton loaders for pending content
            showSkeletonLoaders();

            // 3. Start background jobs to load remaining content
            const metadata = result.metadata || {};
            const { cvText, jobDescription, language } = metadata;

            if (!cvText || !jobDescription || !language) {
                console.error('❌ Missing metadata for lazy loading');
                showError();
                return;
            }

            // Load content with priority order:
            // 1. Changes (match score + improvements) - MOST IMPORTANT
            // 2. Cover letter - secondary
            // 3. Recruiter tips - tertiary
            try {
                // Priority 1: Load changes immediately (contains match score & improvements)
                loadChangesInBackground(cvText, result.improvedCV, jobDescription, language);

                // Priority 2: Load cover letter after 2s
                setTimeout(() => loadCoverLetterInBackground(cvText, jobDescription, language), 2000);

                // Priority 3: Load recruiter tips after 5s
                setTimeout(() => loadRecruiterTipsInBackground(jobDescription, language), 5000);
            } catch (error) {
                console.error('❌ Error in lazy loading:', error);
            }
        }

        // Show skeleton loaders while content is loading
        function showSkeletonLoaders() {
            // Cover Letter skeleton
            document.getElementById('coverLetter').innerHTML = '<div class="animate-pulse"><div class="h-4 bg-gray-200 rounded w-3/4 mb-3"></div><div class="h-4 bg-gray-200 rounded w-full mb-3"></div><div class="h-4 bg-gray-200 rounded w-5/6 mb-3"></div></div>';

            // Recruiter Tips skeleton
            document.getElementById('recruiterTipsChecklist').innerHTML = '<div class="animate-pulse"><div class="h-6 bg-gray-200 rounded w-1/2 mb-4"></div><div class="h-4 bg-gray-200 rounded w-full mb-2"></div><div class="h-4 bg-gray-200 rounded w-full mb-2"></div><div class="h-4 bg-gray-200 rounded w-3/4"></div></div>';

            // Changes skeleton
            document.getElementById('changesContent').innerHTML = '<div class="animate-pulse"><div class="h-8 bg-gray-200 rounded w-2/3 mb-4"></div><div class="h-4 bg-gray-200 rounded w-full mb-2"></div><div class="h-4 bg-gray-200 rounded w-full mb-2"></div><div class="h-4 bg-gray-200 rounded w-5/6"></div></div>';
        }

        // Background loading functions
        async function loadCoverLetterInBackground(cvText, jobDescription, language) {
            console.log('📨 Loading cover letter in background...');
            try {
                const response = await fetch('/.netlify/functions/generate-letter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cvText, jobDescription, language })
                });
                if (!response.ok) throw new Error('Letter generation failed');
                const data = await response.json();
                console.log('✅ Cover letter loaded!');
                renderMarkdownContent('coverLetter', data.coverLetter);

                // Update sessionStorage
                const stored = JSON.parse(sessionStorage.getItem('cvAnalysisResult'));
                stored.coverLetter = data.coverLetter;
                sessionStorage.setItem('cvAnalysisResult', JSON.stringify(stored));
            } catch (error) {
                console.error('❌ Cover letter loading failed:', error);
                document.getElementById('coverLetter').innerHTML = '<p class="text-red-500">Failed to load cover letter. Please refresh the page.</p>';
            }
        }

        async function loadRecruiterTipsInBackground(jobDescription, language) {
            console.log('💡 Loading recruiter tips in background...');
            try {
                const response = await fetch('/.netlify/functions/generate-tips', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jobDescription, language })
                });
                if (!response.ok) throw new Error('Tips generation failed');
                const data = await response.json();
                console.log('✅ Recruiter tips loaded!');
                renderRecruiterTipsChecklist(data.recruiterTips);

                // Update sessionStorage
                const stored = JSON.parse(sessionStorage.getItem('cvAnalysisResult'));
                stored.recruiterTips = data.recruiterTips;
                sessionStorage.setItem('cvAnalysisResult', JSON.stringify(stored));
            } catch (error) {
                console.error('❌ Recruiter tips loading failed:', error);
                document.getElementById('recruiterTipsChecklist').innerHTML = '<p class="text-red-500">Failed to load tips. Please refresh the page.</p>';
            }
        }

        async function loadChangesInBackground(cvText, improvedCV, jobDescription, language) {
            console.log('📝 Loading changes analysis in background (4 parallel requests)...');
            try {
                // Load all 4 change categories in parallel
                const [atsData, impactData, polishData, matchData] = await Promise.all([
                    fetch('/.netlify/functions/generate-changes-ats', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ originalCV: cvText, improvedCV, language })
                    }).then(r => r.json()),
                    fetch('/.netlify/functions/generate-changes-impact', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ originalCV: cvText, improvedCV, language })
                    }).then(r => r.json()),
                    fetch('/.netlify/functions/generate-changes-polish', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ originalCV: cvText, improvedCV, language })
                    }).then(r => r.json()),
                    fetch('/.netlify/functions/generate-changes-match', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ originalCV: cvText, improvedCV, jobDescription, language })
                    }).then(r => r.json())
                ]);

                // Combine changes
                const changesOverview = `## 🎯 ATS & Keywords Optimalisatie\n\n${atsData.atsChanges}\n\n## 💪 Impact & Resultaten\n\n${impactData.impactChanges}\n\n## ✨ Professionele Polish\n\n${polishData.polishChanges}\n\n## 🔥 Job Match & Targeting\n\n${matchData.matchChanges}`;

                console.log('✅ All changes loaded!');
                renderChangesContent(changesOverview);

                // Update stats now that we have all content
                const stored = JSON.parse(sessionStorage.getItem('cvAnalysisResult'));
                stored.changesOverview = changesOverview;
                sessionStorage.setItem('cvAnalysisResult', JSON.stringify(stored));

                // Calculate and update stats
                const fullText = [changesOverview, stored.improvedCV, stored.coverLetter || '', stored.recruiterTips || ''].join('\n\n');
                const stats = extractStats(fullText, stored);
                updateStats(stats.matchScore, stats.changesCount);

            } catch (error) {
                console.error('❌ Changes loading failed:', error);
                document.getElementById('changesContent').innerHTML = '<p class="text-red-500">Failed to load changes analysis. Please refresh the page.</p>';
            }
        }

        function extractStats(text, result) {
            console.log('🔍 Starting stats extraction...');
            
            let matchScore = 0;
            let changesCount = 0;
            
            // === CHANGES COUNT EXTRACTION ===
            const numberedMatches = text.match(/###?\s*\d+\./g);
            if (numberedMatches) {
                changesCount = numberedMatches.length;
                console.log(`✅ Found ${changesCount} numbered changes`);
            }
            
            if (changesCount === 0) {
                const headerMatches = text.match(/###\s+\d+\./g);
                if (headerMatches) {
                    changesCount = headerMatches.length;
                    console.log(`✅ Counted ${changesCount} ### headers`);
                }
            }
            
            if (changesCount === 0) {
                const originalCount = (text.match(/\*\*Original(:|eel)?\*\*/gi) || []).length;
                const improvedCount = (text.match(/\*\*Verbeterd(:|e)?\*\*/gi) || []).length;
                changesCount = Math.min(originalCount, improvedCount);
                console.log(`✅ Found ${changesCount} Original/Verbeterd pairs`);
            }
            
            if (changesCount === 0 && text.length > 500) {
                changesCount = 5;
                console.log('⚠️ Using fallback: 5 changes');
            }
            
            // === MATCH SCORE EXTRACTION ===
            const scorePatterns = [
                /match score[:\s]*(\d+)%/i,
                /score[:\s]*(\d+)%/i,
                /(\d+)%\s*match/i,
                /compatibility[:\s]*(\d+)%/i
            ];
            
            for (const pattern of scorePatterns) {
                const match = text.match(pattern);
                if (match) {
                    matchScore = parseInt(match[1]);
                    console.log(`✅ Found match score: ${matchScore}%`);
                    break;
                }
            }
            
            // SMART CALCULATION if no explicit score found
            if (matchScore === 0) {
                console.log('⚠️ No match score pattern found, calculating...');
                
                let calculatedScore = 50;
                if (changesCount > 0) calculatedScore += Math.min(changesCount * 3, 25);
                if (text.includes('waarom') || text.includes('because')) calculatedScore += 10;
                if (/skills|experience|achievement/i.test(text)) calculatedScore += 5;
                if (text.includes('**')) calculatedScore += 5;
                if (text.length > 2000) calculatedScore += 5;
                
                matchScore = Math.min(calculatedScore, 95);
                console.log(`💡 Calculated score: ${matchScore}%`);
            }
            
            return { matchScore, changesCount };
        }

        function updateStats(matchScore, changesCount) {
            console.log('📊 Updating stats in UI...');

            // Calculate before score (estimated based on improvement)
            const beforeScore = Math.max(40, matchScore - 28); // Assume ~28% average improvement
            const improvement = matchScore - beforeScore;
            const improvementPercent = Math.round((improvement / beforeScore) * 100);

            // Update Match Score with Before/After
            const matchScoreContainer = document.getElementById('matchScoreContainer');
            matchScoreContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: center; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="text-align: center;">
                            <div style="font-size: 0.625rem; color: #9ca3af; font-weight: 700; text-transform: uppercase; margin-bottom: 0.25rem;">Was</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #9ca3af; text-decoration: line-through;">${beforeScore}%</div>
                        </div>
                        <div style="font-size: 1.5rem; color: #10b981;">→</div>
                        <div style="text-align: center;">
                            <div style="font-size: 0.625rem; color: #10b981; font-weight: 700; text-transform: uppercase; margin-bottom: 0.25rem;">Nu</div>
                            <div style="font-size: 2rem; font-weight: 700; background: linear-gradient(to right, #10b981, #14b8a6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;" class="score-animate">${matchScore}%</div>
                        </div>
                    </div>
                    <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0.75rem; background: #dcfce7; border-radius: 999px;">
                        <svg style="width: 1rem; height: 1rem; color: #10b981;" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clip-rule="evenodd"/>
                        </svg>
                        <span style="color: #166534; font-weight: 700; font-size: 0.75rem;">+${improvement}%</span>
                    </div>
                </div>
            `;

            document.getElementById('matchScoreSubtext').innerHTML = `
                <span class="text-green-600 font-semibold">${improvementPercent}% meer kans</span> op interview callback
            `;

            // Update Quality Badge System
            updateQualityBadge(matchScore, changesCount);

            // Update changes count in subtext
            const changesCountEl = document.getElementById('changesCount');
            if (changesCountEl) {
                changesCountEl.textContent = changesCount;
                changesCountEl.classList.remove('skeleton-text');
            }

            // Update AI Impact Metrics (dynamic!)
            updateImpactMetrics(matchScore, changesCount, improvement);

            // Show achievement if score is high
            if (matchScore >= 85) {
                showAchievement('ATS Master', 'Uw CV scoort ' + matchScore + '%+ op ATS systemen!');
            }

            // Update comparison stats
            if (typeof window.updateComparisonStats === 'function') {
                window.updateComparisonStats(matchScore);
            }

            console.log('✅ Stats updated');
        }

        function updateImpactMetrics(matchScore, changesCount, improvement) {
            const container = document.getElementById('impactContainer');
            const titleEl = document.getElementById('impactTitle');
            const subtextEl = document.getElementById('impactSubtext');

            // Calculate time saved (assume ~5 min per improvement)
            const timeSaved = Math.round(changesCount * 5);
            const hours = Math.floor(timeSaved / 60);
            const minutes = timeSaved % 60;
            const timeText = hours > 0 ? `${hours}u ${minutes}m` : `${minutes} min`;

            // Dynamic display based on number of improvements
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <div style="font-size: 3rem; line-height: 1;">
                        ${changesCount}
                    </div>
                    <div style="font-size: 0.875rem; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 0.05em;">
                        Verbeteringen
                    </div>
                </div>
            `;

            titleEl.innerHTML = `⏱️ ${timeText} werk bespaard`;
            titleEl.className = 'text-gray-600 font-semibold text-sm lg:text-base';

            // Dynamic subtext based on improvement level
            let impactText = '';
            if (improvement >= 30) {
                impactText = '<span class="text-green-600 font-bold">💎 Elite-level</span> optimalisatie';
            } else if (improvement >= 20) {
                impactText = '<span class="text-blue-600 font-bold">🚀 Major</span> verbetering';
            } else if (improvement >= 10) {
                impactText = '<span class="text-purple-600 font-bold">✨ Goede</span> upgrade';
            } else {
                impactText = '<span class="text-gray-600 font-bold">📈 Verfijnd</span> en gepolijst';
            }

            subtextEl.innerHTML = impactText;
            subtextEl.className = 'text-xs lg:text-sm mt-1';
        }

        function updateQualityBadge(matchScore, changesCount) {
            const container = document.getElementById('qualityBadgeContainer');
            const levelEl = document.getElementById('qualityLevel');

            // Calculate BEFORE score (original CV quality)
            const beforeScore = Math.max(40, matchScore - 28);

            let badge, level, color, emoji;
            let beforeBadge, beforeEmoji;

            // AFTER applying changes (target level)
            if (matchScore >= 90 && changesCount >= 10) {
                badge = 'Platinum';
                level = 'Elite Quality';
                color = 'from-gray-300 to-blue-200';
                emoji = '💎';
            } else if (matchScore >= 80) {
                badge = 'Gold';
                level = 'Premium Quality';
                color = 'from-yellow-400 to-orange-400';
                emoji = '🥇';
            } else if (matchScore >= 70) {
                badge = 'Silver';
                level = 'High Quality';
                color = 'from-gray-400 to-gray-300';
                emoji = '🥈';
            } else {
                badge = 'Bronze';
                level = 'Good Quality';
                color = 'from-orange-600 to-yellow-700';
                emoji = '🥉';
            }

            // BEFORE level (original quality)
            if (beforeScore >= 80) {
                beforeBadge = 'Gold';
                beforeEmoji = '🥇';
            } else if (beforeScore >= 70) {
                beforeBadge = 'Silver';
                beforeEmoji = '🥈';
            } else {
                beforeBadge = 'Bronze';
                beforeEmoji = '🥉';
            }

            // Show TARGET badge with "potential" indicator
            container.innerHTML = `
                <div style="position: relative;">
                    <!-- Small "before" badge in corner -->
                    <div style="position: absolute; top: -8px; left: -8px; width: 40px; height: 40px; background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 2; border: 3px solid white;">
                        ${beforeEmoji}
                    </div>

                    <!-- Main "after" badge -->
                    <div class="w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-4xl shadow-lg score-animate" style="position: relative; z-index: 1;">
                        ${emoji}
                    </div>

                    <!-- Arrow indicator showing upgrade -->
                    <div style="position: absolute; top: 50%; left: -12px; transform: translateY(-50%); font-size: 1rem; z-index: 3;">
                        →
                    </div>
                </div>
            `;

            levelEl.innerHTML = `
                <div>
                    <span class="font-bold text-lg" style="color: #10b981;">${badge}</span>
                    <span class="text-sm" style="color: #6b7280;"> ${level}</span>
                </div>
                <div style="font-size: 0.7rem; color: #9ca3af; margin-top: 0.25rem; font-weight: 600;">
                    Met alle ${changesCount} wijzigingen
                </div>
            `;
        }

        function showAchievement(title, description) {
            const banner = document.getElementById('achievementBanner');
            document.getElementById('achievementTitle').textContent = title;
            document.getElementById('achievementDesc').textContent = description;

            banner.classList.remove('hidden');
            banner.classList.add('animate-bounce-slow');

            // Hide after 5 seconds
            setTimeout(() => {
                banner.style.opacity = '0';
                banner.style.transition = 'opacity 0.5s';
                setTimeout(() => {
                    banner.classList.add('hidden');
                    banner.style.opacity = '1';
                }, 500);
            }, 5000);
        }

        function updateRateLimitDisplay(rateLimit) {
            if (!rateLimit) {
                console.log('⚠️ No rate limit data available');
                return;
            }

            console.log('📊 Updating rate limit display:', rateLimit);

            const usageEl = document.getElementById('rateLimitUsage');
            const subtextEl = document.getElementById('rateLimitSubtext');

            if (rateLimit.isDeveloperMode) {
                // Developer mode: show unlimited
                usageEl.textContent = `${rateLimit.used}/∞`;
                usageEl.style.backgroundImage = 'linear-gradient(to right, #f59e0b, #eab308)'; // Gold gradient
                subtextEl.innerHTML = '🔓 <strong>Developer Mode</strong>';
                subtextEl.style.color = '#f59e0b';
                console.log('🔓 Developer mode active');
            } else {
                // Normal mode: show usage
                usageEl.textContent = `${rateLimit.used}/${rateLimit.total}`;

                // Change color based on usage
                const percentageUsed = (rateLimit.used / rateLimit.total) * 100;
                if (percentageUsed >= 90) {
                    usageEl.style.backgroundImage = 'linear-gradient(to right, #ef4444, #dc2626)'; // Red
                } else if (percentageUsed >= 70) {
                    usageEl.style.backgroundImage = 'linear-gradient(to right, #f59e0b, #d97706)'; // Orange
                } else {
                    usageEl.style.backgroundImage = 'linear-gradient(to right, #10b981, #14b8a6)'; // Green
                }

                subtextEl.textContent = `${rateLimit.remaining} remaining`;
                subtextEl.style.color = '#9ca3af';
            }

            console.log('✅ Rate limit display updated');
        }

        function animateNumber(element, start, end, duration, suffix = '') {
            const range = end - start;
            const increment = range / (duration / 16);
            let current = start;
            
            const timer = setInterval(() => {
                current += increment;
                if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                    current = end;
                    clearInterval(timer);
                }
                element.textContent = Math.round(current) + suffix;
            }, 16);
        }

        // 🎮 GAMIFICATION FUNCTIONS

        const categories = {
            ats: { name: 'ATS & Keywords', icon: '🎯', color: 'blue', changes: [] },
            impact: { name: 'Impact & Resultaten', icon: '💪', color: 'green', changes: [] },
            polish: { name: 'Professionele Polish', icon: '✨', color: 'purple', changes: [] },
            structure: { name: 'Structuur & Leesbaarheid', icon: '🎨', color: 'orange', changes: [] },
            targeting: { name: 'Job Match & Targeting', icon: '🔥', color: 'red', changes: [] }
        };

        function categorizeChange(changeTitle, changeContent, sectionTitle = '') {
            const fullText = (changeTitle + ' ' + changeContent + ' ' + sectionTitle).toLowerCase();
            const sectionText = sectionTitle.toLowerCase();

            // PRIORITY: Check section title first for explicit category matches
            // This ensures section-based grouping takes precedence
            if (sectionText.match(/ats|keywords|optimalisatie/i)) {
                return 'ats';
            }
            if (sectionText.match(/impact|resultaten|achievements/i)) {
                return 'impact';
            }
            if (sectionText.match(/polish|professionele/i)) {
                return 'polish';
            }
            if (sectionText.match(/structuur|leesbaarheid|readability/i)) {
                return 'structure';
            }
            if (sectionText.match(/job.*match|targeting/i)) {
                return 'targeting';
            }

            // FALLBACK: Check content for category keywords
            // ATS & Keywords
            if (fullText.match(/keyword|ats|applicant tracking|seo|search|optimalisatie|zoekwoord/i)) {
                return 'ats';
            }
            // Impact & Achievements
            if (fullText.match(/kwantif|cijfer|resultaat|impact|achievement|metric|percentage|increase|ROI|revenue|growth/i)) {
                return 'impact';
            }
            // Structure & Readability
            if (fullText.match(/structuur|layout|format|leesbaarheid|readability|bullet|section|visual|hierarchy/i)) {
                return 'structure';
            }
            // Job Match & Targeting
            if (fullText.match(/job.*match|targeting|relevance|specifiek|tailored|customized|afstemming/i)) {
                return 'targeting';
            }
            // Professional Polish
            if (fullText.match(/polish|professionele|grammatica|spelling|toon|consistency|consistentie|taal|language|formeel|formal/i)) {
                return 'polish';
            }
            // Default to polish for anything not categorized
            return 'polish';
        }

        function updateCategoryScores(categorizedChanges) {
            let totalOriginalScore = 0;
            let totalOptimizedScore = 0;
            let totalChanges = 0;

            console.log('📊 Updating category scores:', categorizedChanges);

            Object.keys(categories).forEach(catKey => {
                const changes = categorizedChanges[catKey] || [];
                const count = changes.length;
                totalChanges += count;
                console.log(`  ${catKey}: ${count} changes`);

                // NEW LOGIC: Calculate Original CV Quality (inverse - fewer changes = better original)
                // 0 changes = 100% (excellent original), 5+ changes = 40% (poor original)
                const originalScore = Math.max(35, 100 - (count * 12));

                // Optimized CV is always excellent (95%)
                const optimizedScore = 95;

                // Improvement gain
                const improvementGain = optimizedScore - originalScore;

                // Update UI - show IMPROVEMENT GAIN as the score
                const scoreEl = document.getElementById(`score-${catKey}`);
                scoreEl.textContent = '+' + improvementGain;
                scoreEl.classList.remove('skeleton-text'); // Remove loading skeleton
                scoreEl.classList.add('score-animate');

                const countEl = document.getElementById(`count-${catKey}`);
                countEl.classList.remove('skeleton-text'); // Remove loading skeleton

                const progressEl = document.getElementById(`progress-${catKey}`);
                progressEl.classList.remove('progress-bar-loading'); // Remove loading animation
                progressEl.classList.add('transition-all', 'duration-1000');
                progressEl.style.width = improvementGain + '%';

                // Update "Loading..." text below score to show actual /100
                const scoreParent = scoreEl.parentElement;
                const loadingText = scoreParent.querySelector('.text-xs');
                if (loadingText) {
                    loadingText.textContent = '/ 100';
                    loadingText.className = 'text-xs text-gray-500 font-semibold';
                }

                // Special handling for categories with 0 changes (already perfect!)
                if (count === 0) {
                    // Hide the score container completely - replace with "what's already good" message
                    const scoreContainer = scoreEl.parentElement;

                    // Messages per category explaining what's already good
                    const goodMessages = {
                        'ats': 'Keywords perfect geoptimaliseerd',
                        'impact': 'Impact sterk gecommuniceerd',
                        'polish': 'Toon & grammatica uitstekend',
                        'structure': 'Structuur helder & overzichtelijk',
                        'targeting': 'Matcht goed met functie'
                    };

                    scoreContainer.innerHTML = `
                        <div style="text-align: right;">
                            <div style="color: #10b981; font-size: 1.125rem; font-weight: 700; line-height: 1.3;">
                                ✓ Perfect!
                            </div>
                            <div style="color: #059669; font-size: 0.75rem; margin-top: 0.25rem; line-height: 1.3;">
                                ${goodMessages[catKey] || 'Reeds uitstekend'}
                            </div>
                        </div>
                    `;

                    // Show positive message instead of "0 verbeteringen"
                    countEl.innerHTML = '<span style="color: #10b981; font-weight: 700;">Geen wijzigingen nodig</span>';

                    // Green full progress bar
                    progressEl.style.width = '100%';
                    progressEl.className = 'h-2 rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-1000';

                    // Level badge
                    const levelEl = document.getElementById(`level-${catKey}`);
                    levelEl.innerHTML = '<span style="color: #10b981;">✓ Al perfect</span>';

                    // Disable the category card - make it visually subdued but still clickable for scrolling
                    const card = document.querySelector(`.category-card[data-category="${catKey}"]`);
                    if (card) {
                        card.classList.add('category-disabled');
                        card.style.cursor = 'pointer'; // Keep clickable for scrolling
                        card.style.opacity = '0.8';
                    }
                } else {
                    // Normal flow for categories with changes
                    countEl.textContent = count;

                    // Color coding based on improvement gain
                    if (improvementGain >= 50) scoreEl.className = 'text-3xl font-bold text-green-600 score-animate';
                    else if (improvementGain >= 30) scoreEl.className = 'text-3xl font-bold text-yellow-600 score-animate';
                    else scoreEl.className = 'text-3xl font-bold text-blue-600 score-animate';

                    // Level badges based on improvement
                    const levelEl = document.getElementById(`level-${catKey}`);
                    if (improvementGain >= 55) levelEl.textContent = '💎 Massive Gain';
                    else if (improvementGain >= 40) levelEl.textContent = '🥇 Major Boost';
                    else if (improvementGain >= 25) levelEl.textContent = '🥈 Good Improvement';
                    else levelEl.textContent = '✨ Enhanced';
                }

                totalOriginalScore += originalScore;
                totalOptimizedScore += optimizedScore;
            });

            // Overall scores
            const avgOriginal = Math.round(totalOriginalScore / 5);
            const avgOptimized = Math.round(totalOptimizedScore / 5);
            const overallGain = avgOptimized - avgOriginal;

            // Show the improvement gain
            animateNumber(document.getElementById('overall-score'), 0, overallGain, 1500, '');

            // Circular progress - show the improvement gain
            const circle = document.getElementById('overall-progress-ring');
            const circumference = 2 * Math.PI * 56;
            const offset = circumference - (overallGain / 60) * circumference; // Max gain is ~60
            setTimeout(() => {
                circle.style.strokeDashoffset = offset;
            }, 500);

            // Track gamification scores in GA4
            if (window.trackEvent) {
                window.trackEvent('cv_score_calculated', {
                    overall_improvement: overallGain,
                    original_score: avgOriginal,
                    optimized_score: avgOptimized,
                    total_changes: totalChanges
                });
            }

            // Show achievements
            showAchievements(overallGain, totalChanges, avgOriginal, avgOptimized);
        }

        function showAchievements(improvementGain, totalChanges, originalScore, optimizedScore) {
            const badgesContainer = document.getElementById('achievement-badges');
            badgesContainer.innerHTML = '';

            const achievements = [];

            // NEW: Achievements based on IMPROVEMENT, not just changes
            if (improvementGain >= 50) achievements.push({ icon: '🚀', text: 'Massive Transformation' });
            if (improvementGain >= 40) achievements.push({ icon: '⭐', text: 'Major Upgrade' });
            if (improvementGain >= 30) achievements.push({ icon: '💎', text: 'Significant Boost' });
            if (totalChanges >= 12) achievements.push({ icon: '🏆', text: 'Fully Optimized' });
            if (optimizedScore >= 90) achievements.push({ icon: '🎯', text: 'Elite Quality CV' });

            achievements.forEach((ach, index) => {
                setTimeout(() => {
                    const badge = document.createElement('div');
                    badge.className = 'achievement-badge badge-animate';
                    badge.innerHTML = `<span>${ach.icon}</span><span>${ach.text}</span>`;
                    badgesContainer.appendChild(badge);
                }, index * 200);
            });

            // Track achievements in GA4
            if (achievements.length > 0 && window.trackEvent) {
                window.trackEvent('achievements_unlocked', {
                    achievement_count: achievements.length,
                    achievements: achievements.map(a => a.text).join(', '),
                    improvement_gain: improvementGain,
                    original_score: originalScore,
                    optimized_score: optimizedScore,
                    total_changes: totalChanges
                });
            }

            // Confetti on big improvements!
            if (improvementGain >= 40) {
                setTimeout(() => {
                    createConfetti();

                    // Track confetti celebration in GA4
                    if (window.trackEvent) {
                        window.trackEvent('confetti_celebration', {
                            improvement_gain: improvementGain
                        });
                    }
                }, 1000);
            }
        }

        function createConfetti() {
            const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];
            for (let i = 0; i < 50; i++) {
                setTimeout(() => {
                    const confetti = document.createElement('div');
                    confetti.className = 'confetti';
                    confetti.style.left = Math.random() * window.innerWidth + 'px';
                    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    confetti.style.animationDelay = Math.random() * 0.5 + 's';
                    document.body.appendChild(confetti);
                    setTimeout(() => confetti.remove(), 3000);
                }, i * 30);
            }
        }

        let activeCategory = null;

        function toggleCategory(catKey) {
            const card = document.querySelector(`.category-card[data-category="${catKey}"]`);

            // For disabled categories (0 improvements), scroll to category cards section
            if (card && card.classList.contains('category-disabled')) {
                const categorySection = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');
                if (categorySection) {
                    const offset = 100; // pixels from top
                    const elementPosition = categorySection.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
                return;
            }

            // Check if this category is already active
            const isExpanded = card.classList.contains('active');

            if (isExpanded) {
                // Clicking on active category - deactivate and show all
                card.classList.remove('active');

                // Show all change cards
                const allChangeCards = document.querySelectorAll('.category-group');
                allChangeCards.forEach(change => {
                    change.style.display = '';
                    change.style.order = '';
                    const changeContent = change.querySelector('.change-content-collapsible');
                    if (changeContent) {
                        changeContent.classList.add('expanded');
                    }
                });

                // Show all sections but keep them collapsed initially
                const allSections = document.querySelectorAll('#changesContent > div');
                allSections.forEach(section => {
                    section.style.display = '';
                    section.style.order = '';
                    const sectionContent = section.querySelector('[id^="section-content-"]');
                    const sectionIcon = section.querySelector('[id^="section-icon-"]');
                    if (sectionContent) {
                        // Don't force expand - keep user's previous state
                        sectionContent.style.maxHeight = '';
                    }
                    if (sectionIcon) {
                        // Don't force rotate - keep user's previous state
                    }
                });

                // Track category collapse in GA4
                if (window.trackEvent) {
                    window.trackEvent('category_collapsed', {
                        category: catKey
                    });
                }
            } else {
                // Deactivate all other category cards (without resetting view)
                document.querySelectorAll('.category-card').forEach(c => {
                    c.classList.remove('active');
                });

                // Activate this category
                card.classList.add('active');

                // Process all sections
                const allSections = document.querySelectorAll('#changesContent > div');
                allSections.forEach((section, sectionIndex) => {
                    const changeCardsInSection = section.querySelectorAll('.category-group');
                    const hasMatchingChanges = Array.from(changeCardsInSection).some(
                        card => card.dataset.category === catKey
                    );

                    if (hasMatchingChanges) {
                        // Section has matching changes - show section, show matching changes, collapse others
                        section.style.display = '';
                        section.style.order = '-1'; // Move to top

                        // Force expand the section (override any previous collapse)
                        const sectionContent = section.querySelector('[id^="section-content-"]');
                        const sectionIcon = section.querySelector('[id^="section-icon-"]');
                        if (sectionContent) {
                            sectionContent.classList.remove('collapsed');
                            sectionContent.classList.add('expanded');
                            // Force max-height to ensure visibility
                            sectionContent.style.maxHeight = '5000px';
                        }
                        if (sectionIcon) {
                            sectionIcon.classList.add('rotate-180');
                        }

                        // Show/hide changes within this section
                        changeCardsInSection.forEach(changeCard => {
                            if (changeCard.dataset.category === catKey) {
                                changeCard.style.display = '';
                                changeCard.style.order = '-1';
                                // Expand the change
                                const changeContent = changeCard.querySelector('.change-content-collapsible');
                                if (changeContent) {
                                    changeContent.classList.add('expanded');
                                }
                            } else {
                                changeCard.style.display = 'none';
                            }
                        });
                    } else {
                        // Section has no matching changes - keep visible but collapsed and move to bottom
                        section.style.display = '';
                        section.style.order = '999'; // Move to bottom

                        // Force collapse the section
                        const sectionContent = section.querySelector('[id^="section-content-"]');
                        const sectionIcon = section.querySelector('[id^="section-icon-"]');
                        if (sectionContent) {
                            sectionContent.classList.remove('expanded');
                            sectionContent.style.maxHeight = '0px'; // Force collapse
                        }
                        if (sectionIcon) {
                            sectionIcon.classList.remove('rotate-180');
                        }

                        // Keep changes visible but ensure they're in collapsed section
                        // Don't hide them - they'll be hidden by the collapsed parent
                        changeCardsInSection.forEach(changeCard => {
                            changeCard.style.display = '';
                        });
                    }
                });

                // Track category expansion in GA4
                if (window.trackEvent) {
                    window.trackEvent('category_expanded', {
                        category: catKey
                    });
                }

                // Scroll to the improvements section
                setTimeout(() => {
                    const changesSection = document.getElementById('changesContent');
                    if (changesSection) {
                        // Calculate position with offset for better visibility
                        const offset = 100; // pixels from top
                        const elementPosition = changesSection.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - offset;

                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });
                    }
                }, 150); // Small delay to let DOM updates complete
            }
        }

        function renderChangesContent(content) {
            if (!content) {
                console.warn('⚠️ No changes content provided');
                document.getElementById('changesContent').innerHTML = '<p class="text-gray-400 italic">Geen wijzigingen gevonden</p>';
                return;
            }

            console.log('🎨 Rendering changes content...');
            console.log('📏 Content length:', content.length);
            console.log('📝 First 300 chars:', content.substring(0, 300));

            const container = document.getElementById('changesContent');

            // Detect format: Check if content has the new field structure
            const hasNewFormat = content.includes('**Origineel:**') ||
                                 content.includes('**Original:**') ||
                                 content.includes('**Verbeterd:**') ||
                                 content.includes('**Improved:**');
            console.log(`📋 Format detected: ${hasNewFormat ? 'NEW (with fields)' : 'OLD (flat)'}`);
            console.log(`📄 First 300 chars: ${content.substring(0, 300)}`);

            if (!hasNewFormat) {
                console.log('🔄 Using OLD format renderer');
                renderChangesContentOldFormat(content);
                return;
            }

            console.log('✨ Using NEW hierarchical format renderer');
            const lines = content.split('\n');

            let html = '';
            let sectionIndex = 0;
            let changeIndex = 0;
            let globalChangeIndex = 0;

            let currentSection = null;
            let currentChange = null;
            let sectionChangesBuffer = '';
            let changeContentBuffer = '';
            let sectionChangeCount = 0;
            const sectionChangeCounts = {}; // Track change count per section

            for (let line of lines) {
                line = line.trim();

                // ## CV Section Header (e.g., ## Summary Section)
                if (line.match(/^##\s+(?!.*📊)/)) {
                    // Close previous change if exists
                    if (currentChange !== null) {
                        sectionChangesBuffer += `
                                        ${changeContentBuffer}
                                    </div>
                                </div>
                            </div>
                        `;
                        changeContentBuffer = '';
                        currentChange = null;
                    }

                    // Close previous section if exists
                    if (currentSection !== null) {
                        html += `
                                    ${sectionChangesBuffer}
                                </div>
                            </div>
                        </div>
                        `;
                        // Store the change count for this section
                        sectionChangeCounts[currentSection] = sectionChangeCount;
                        sectionChangesBuffer = '';
                        sectionChangeCount = 0;
                    }

                    sectionIndex++;
                    changeIndex = 0; // Reset change index for new section
                    const sectionTitle = line.replace(/^##\s+/, '').trim();

                    // Determine icon based on section name
                    let sectionIcon = '📋';
                    if (sectionTitle.match(/summary|samenvatting/i)) sectionIcon = '📝';
                    else if (sectionTitle.match(/experience|werkervaring/i)) sectionIcon = '💼';
                    else if (sectionTitle.match(/skills|vaardigheden/i)) sectionIcon = '🎯';
                    else if (sectionTitle.match(/education|opleidingen/i)) sectionIcon = '🎓';
                    else if (sectionTitle.match(/projects|projecten/i)) sectionIcon = '🚀';

                    // Create collapsible section
                    html += `
                        <div class="mb-6 bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-purple-100">
                            <button onclick="toggleSection(${sectionIndex})" class="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-300">
                                <div class="flex items-center gap-4 flex-1">
                                    <span class="text-3xl">${sectionIcon}</span>
                                    <div>
                                        <h2 class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">${sectionTitle}</h2>
                                        <p class="text-sm text-gray-500 mt-1" id="section-count-${sectionIndex}">Laden...</p>
                                    </div>
                                </div>
                                <svg id="section-icon-${sectionIndex}" class="w-7 h-7 text-purple-600 transition-transform duration-300 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>
                            <div id="section-content-${sectionIndex}" class="change-content-collapsible expanded">
                                <div class="p-4 bg-gradient-to-br from-gray-50 to-white">
                    `;
                    currentSection = sectionIndex;
                }
                // ### Individual Change Header (e.g., ### 1. Addition of Keywords)
                else if (line.match(/^###\s*\d+\./)) {
                    // Close previous change if exists
                    if (currentChange !== null) {
                        sectionChangesBuffer += `
                                        ${changeContentBuffer}
                                    </div>
                                </div>
                            </div>
                        `;
                        changeContentBuffer = '';
                    }

                    changeIndex++;
                    globalChangeIndex++;
                    sectionChangeCount++;
                    const changeTitle = line.replace(/^###\s*/, '').trim();

                    // Create nested collapsible change card
                    sectionChangesBuffer += `
                        <div class="change-card-collapsible bg-white rounded-xl shadow-md overflow-hidden mb-3 border border-gray-200">
                            <button onclick="toggleChange(${globalChangeIndex})" class="w-full px-5 py-3 text-left flex items-center justify-between hover:bg-purple-50 transition-colors">
                                <div class="flex items-center gap-3 flex-1">
                                    <span class="text-lg">📌</span>
                                    <h4 class="text-lg font-semibold text-gray-800">${changeTitle}</h4>
                                </div>
                                <svg id="change-icon-${globalChangeIndex}" class="w-5 h-5 text-purple-600 transition-transform duration-300 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>
                            <div id="change-content-${globalChangeIndex}" class="change-content-collapsible expanded">
                                <div class="px-5 pb-4 space-y-3">
                    `;
                    currentChange = globalChangeIndex;
                }
                // Original section
                else if (line.match(/^\*\*Original(:|eel)?\*\*/i)) {
                    changeContentBuffer += `
                        <div class="original-block">
                            <span class="label-badge label-original">❌ Origineel</span>
                    `;
                    // Capture any text on the same line after the header
                    let sameLineText = line.replace(/^\*\*Original(:|eel)?\*\*:?\s*/i, '').trim();
                    if (sameLineText) {
                        sameLineText = sameLineText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        changeContentBuffer += `<p class="text-gray-700 leading-relaxed text-sm">${sameLineText}</p>`;
                    }
                }
                // Improved section
                else if (line.match(/^\*\*Verbeterd(:|e)?\*\*/i) || line.match(/^\*\*Improved(:|e)?\*\*/i)) {
                    changeContentBuffer += `</div>
                        <div class="improved-block">
                            <span class="label-badge label-improved">✅ Verbeterd</span>
                    `;
                    // Capture any text on the same line after the header
                    let sameLineText = line.replace(/^\*\*(Verbeterd(:|e)?|Improved(:|e)?)\*\*:?\s*/i, '').trim();
                    if (sameLineText) {
                        sameLineText = sameLineText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        changeContentBuffer += `<p class="text-gray-700 leading-relaxed text-sm">${sameLineText}</p>`;
                    }
                }
                // Why section
                else if (line.match(/^\*\*Why this (change )?matters(:|e)?\*\*/i) || line.match(/^\*\*Waarom(:|e)?\*\*/i)) {
                    changeContentBuffer += `</div>
                        <div class="why-block">
                            <span class="label-badge label-why">💡 Waarom dit belangrijk is</span>
                    `;
                    // Capture any text on the same line after the header
                    let sameLineText = line.replace(/^\*\*(Why this (change )?matters(:|e)?|Waarom(:|e)?)\*\*:?\s*/i, '').trim();
                    if (sameLineText) {
                        sameLineText = sameLineText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        changeContentBuffer += `<p class="text-gray-700 leading-relaxed text-sm">${sameLineText}</p>`;
                    }
                }
                // Impact rating
                else if (line.match(/^\*\*Impact/i)) {
                    const stars = (line.match(/⭐/g) || []).length;
                    changeContentBuffer += `</div>
                        <div class="mt-3 flex items-center gap-2">
                            <span class="text-gray-700 font-semibold text-sm">Impact:</span>
                            <span class="star-rating text-xl">${'⭐'.repeat(stars)}</span>
                        </div>
                    `;
                }
                // Regular content
                else if (line && !line.match(/^---+$/)) {
                    // Remove markdown bold syntax
                    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    changeContentBuffer += `<p class="text-gray-700 leading-relaxed text-sm">${line}</p>`;
                }
                // Separator - end of change
                else if (line.match(/^---+$/)) {
                    if (currentChange !== null) {
                        sectionChangesBuffer += `
                                        ${changeContentBuffer}
                                    </div>
                                </div>
                            </div>
                        `;
                        changeContentBuffer = '';
                        currentChange = null;
                    }
                }
            }

            // Close remaining change
            if (currentChange !== null) {
                sectionChangesBuffer += `
                                    ${changeContentBuffer}
                                </div>
                            </div>
                        </div>
                `;
            }

            // Close remaining section
            if (currentSection !== null) {
                html += `
                                ${sectionChangesBuffer}
                            </div>
                        </div>
                    </div>
                `;
                // Store the change count for the last section
                sectionChangeCounts[currentSection] = sectionChangeCount;
            }

            container.innerHTML = html || '<p class="text-gray-400 italic">Geen wijzigingen gevonden</p>';
            console.log(`✅ Changes rendered: ${sectionIndex} sections, ${globalChangeIndex} changes`);

            // Update all section counts after rendering
            Object.keys(sectionChangeCounts).forEach(secIdx => {
                const count = sectionChangeCounts[secIdx];
                const countEl = document.getElementById(`section-count-${secIdx}`);
                if (countEl) {
                    countEl.textContent = `${count} wijziging${count !== 1 ? 'en' : ''}`;
                }
            });
            console.log(`✅ Section counts updated:`, sectionChangeCounts);

            // Categorize changes and update category scores (same as OLD format)
            setTimeout(() => {
                const allChanges = document.querySelectorAll('.change-card-collapsible');
                const categorizedChanges = { ats: [], impact: [], polish: [], structure: [], targeting: [] };

                allChanges.forEach((card, idx) => {
                    const title = card.querySelector('h4')?.textContent || '';
                    const content = card.querySelector('.change-content-collapsible')?.textContent || '';

                    // Also get parent section title for better categorization
                    const parentSection = card.closest('[id^="section-content-"]')?.previousElementSibling;
                    const sectionTitle = parentSection?.querySelector('h2')?.textContent || '';

                    const category = categorizeChange(title, content, sectionTitle);
                    categorizedChanges[category].push({ title, content, index: idx + 1 });

                    // Add category class
                    card.classList.add('category-group');
                    card.dataset.category = category;
                });

                updateCategoryScores(categorizedChanges);
                console.log('✅ Category scores updated:', categorizedChanges);
            }, 500);
        }

        // Toggle CV section
        function toggleSection(sectionNum) {
            const content = document.getElementById(`section-content-${sectionNum}`);
            const icon = document.getElementById(`section-icon-${sectionNum}`);

            if (content.classList.contains('expanded')) {
                // Collapse
                content.classList.remove('expanded');
                content.style.maxHeight = '0px'; // Override any inline style from category filter
                icon.classList.remove('rotate-180');
            } else {
                // Expand
                content.classList.add('expanded');
                content.style.maxHeight = '5000px'; // Override any inline style from category filter
                icon.classList.add('rotate-180');
            }
        }

        // Toggle individual change card
        function toggleChange(changeNum) {
            const content = document.getElementById(`change-content-${changeNum}`);
            const icon = document.getElementById(`change-icon-${changeNum}`);

            if (content && icon) {
                if (content.classList.contains('expanded')) {
                    content.classList.remove('expanded');
                    icon.classList.remove('rotate-180');
                } else {
                    content.classList.add('expanded');
                    icon.classList.add('rotate-180');
                }
            }
        }

        // Collapse all changes
        function collapseAllChanges() {
            const allContents = document.querySelectorAll('[id^="change-content-"], [id^="section-content-"]');
            const allIcons = document.querySelectorAll('[id^="change-icon-"], [id^="section-icon-"]');

            allContents.forEach(content => {
                content.classList.remove('expanded');
            });

            allIcons.forEach(icon => {
                icon.classList.remove('rotate-180');
            });

            console.log(`✅ Collapsed ${allContents.length} items`);

            // Track in GA4
            if (window.trackEvent) {
                window.trackEvent('collapse_all_clicked', {
                    items_count: allContents.length
                });
            }
        }

        // Expand all changes
        function expandAllChanges() {
            const allContents = document.querySelectorAll('[id^="change-content-"], [id^="section-content-"]');
            const allIcons = document.querySelectorAll('[id^="change-icon-"], [id^="section-icon-"]');

            allContents.forEach(content => {
                content.classList.add('expanded');
            });

            allIcons.forEach(icon => {
                icon.classList.add('rotate-180');
            });

            console.log(`✅ Expanded ${allContents.length} items`);

            // Track in GA4
            if (window.trackEvent) {
                window.trackEvent('expand_all_clicked', {
                    items_count: allContents.length
                });
            }
        }

        // OLD FORMAT RENDERER (Fallback for backward compatibility)
        function renderChangesContentOldFormat(content) {
            console.log('📜 Rendering OLD flat format...');

            const container = document.getElementById('changesContent');
            const lines = content.split('\n');

            let html = '';
            let changeIndex = 0;
            let currentChange = null;
            let changeContentBuffer = '';

            for (let line of lines) {
                line = line.trim();

                // ### Change header (flat format: ### 1. Title)
                if (line.match(/^###?\s*\d+\./)) {
                    // Close previous change
                    if (currentChange !== null) {
                        html += `
                                    ${changeContentBuffer}
                                </div>
                            </div>
                        </div>
                        `;
                        changeContentBuffer = '';
                    }

                    changeIndex++;
                    const changeTitle = line.replace(/^###?\s*/, '').trim();

                    // Create change card
                    html += `
                        <div class="change-card-collapsible bg-white rounded-xl shadow-lg overflow-hidden mb-4 border-2 border-gray-100">
                            <button onclick="toggleChange(${changeIndex})" class="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-purple-50 transition-colors">
                                <div class="flex items-center gap-3 flex-1">
                                    <span class="text-2xl">📝</span>
                                    <h3 class="text-xl font-bold text-gray-900">${changeTitle}</h3>
                                </div>
                                <svg id="change-icon-${changeIndex}" class="w-6 h-6 text-purple-600 transition-transform duration-300 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>
                            <div id="change-content-${changeIndex}" class="change-content-collapsible expanded">
                                <div class="px-6 pb-6 space-y-4">
                    `;
                    currentChange = changeIndex;
                }
                // Original section
                else if (line.match(/^\*\*Original(:|eel)?\*\*/i)) {
                    changeContentBuffer += `
                        <div class="original-block">
                            <span class="label-badge label-original">❌ Origineel</span>
                    `;
                    // Capture any text on the same line after the header
                    let sameLineText = line.replace(/^\*\*Original(:|eel)?\*\*:?\s*/i, '').trim();
                    if (sameLineText) {
                        sameLineText = sameLineText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        changeContentBuffer += `<p class="text-gray-700 leading-relaxed">${sameLineText}</p>`;
                    }
                }
                // Improved section
                else if (line.match(/^\*\*Verbeterd(:|e)?\*\*/i) || line.match(/^\*\*Improved(:|e)?\*\*/i) || line.match(/^\*\*Nieuw(:|e)?\*\*/i)) {
                    changeContentBuffer += `</div>
                        <div class="improved-block">
                            <span class="label-badge label-improved">✅ Verbeterd</span>
                    `;
                    // Capture any text on the same line after the header
                    let sameLineText = line.replace(/^\*\*(Verbeterd(:|e)?|Improved(:|e)?|Nieuw(:|e)?)\*\*:?\s*/i, '').trim();
                    if (sameLineText) {
                        sameLineText = sameLineText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        changeContentBuffer += `<p class="text-gray-700 leading-relaxed">${sameLineText}</p>`;
                    }
                }
                // Why section
                else if (line.match(/^\*\*Why|^\*\*Waarom/i)) {
                    changeContentBuffer += `</div>
                        <div class="why-block">
                            <span class="label-badge label-why">💡 Waarom dit belangrijk is</span>
                    `;
                    // Capture any text on the same line after the header
                    let sameLineText = line.replace(/^\*\*(Why[^*]*|Waarom[^*]*)\*\*:?\s*/i, '').trim();
                    if (sameLineText) {
                        sameLineText = sameLineText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        changeContentBuffer += `<p class="text-gray-700 leading-relaxed">${sameLineText}</p>`;
                    }
                }
                // Impact rating
                else if (line.match(/^\*\*Impact/i)) {
                    const stars = (line.match(/⭐/g) || []).length;
                    changeContentBuffer += `</div>
                        <div class="mt-4 flex items-center gap-2">
                            <span class="text-gray-700 font-semibold">Impact:</span>
                            <span class="star-rating">${'⭐'.repeat(stars)}</span>
                        </div>
                    `;
                }
                // Regular content
                else if (line && !line.match(/^---+$/) && !line.match(/^#{1,3}\s*📊/)) {
                    // Remove markdown bold syntax
                    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    changeContentBuffer += `<p class="text-gray-700 leading-relaxed">${line}</p>`;
                }
                // Separator
                else if (line.match(/^---+$/)) {
                    if (currentChange !== null) {
                        html += `
                                    ${changeContentBuffer}
                                </div>
                            </div>
                        </div>
                        `;
                        changeContentBuffer = '';
                        currentChange = null;
                    }
                }
            }

            // Close last change
            if (currentChange !== null) {
                html += `
                            ${changeContentBuffer}
                        </div>
                    </div>
                </div>
                `;
            }

            container.innerHTML = html || '<p class="text-gray-400 italic">Geen wijzigingen gevonden</p>';
            console.log(`✅ OLD format rendered: ${changeIndex} changes`);

            // 🎮 Update gamification scores based on rendered changes
            setTimeout(() => {
                const allChanges = document.querySelectorAll('.change-card-collapsible');
                const categorizedChanges = { ats: [], impact: [], polish: [], structure: [], targeting: [] };

                allChanges.forEach((card, idx) => {
                    const title = card.querySelector('h3')?.textContent || '';
                    const content = card.querySelector('.change-content-collapsible')?.textContent || '';
                    const category = categorizeChange(title, content);
                    categorizedChanges[category].push({ title, content, index: idx + 1 });

                    // Add category indicator to card
                    const icon = categories[category].icon;
                    const iconSpan = card.querySelector('.text-2xl');
                    if (iconSpan) iconSpan.textContent = icon;

                    // Add category class
                    card.classList.add('category-group');
                    card.dataset.category = category;
                });

                updateCategoryScores(categorizedChanges);
            }, 500);
        }

        function renderCVContent(content) {
            if (!content) return;
            
            console.log('🎨 Rendering CV content...');
            const element = document.getElementById('improvedCV');
            element.textContent = content;
            console.log('✅ CV content rendered');
        }

        /**
         * Clean AI response by removing introductory phrases
         */
        function cleanAIResponse(content) {
            if (!content) return content;

            // Remove common AI intro patterns
            const introPatterns = [
                // Dutch intro phrases
                /^Absoluut!?\s*Hier zijn.*?(?=\n\n|$)/i,
                /^Natuurlijk!?\s*Hier.*?(?=\n\n|$)/i,
                /^Zeker!?\s*Hier.*?(?=\n\n|$)/i,
                /^Uiteraard!?\s*Hier.*?(?=\n\n|$)/i,
                /^Oké!?\s*Hier.*?(?=\n\n|$)/i,
                /^Prima!?\s*Hier.*?(?=\n\n|$)/i,
                /^Hier zijn.*?CV van.*?opgesteld.*?(?=\n\n|$)/i,
                /^Hier zijn.*?gedetailleerde.*?verbeteringen.*?(?=\n\n|$)/i,

                // "Hieronder vind je..." patterns
                /^Hieronder vind je.*?(?=\n\n|###|Origineel:|$)/i,

                // Generic patterns
                /^(?:Absoluut|Natuurlijk|Zeker|Uiteraard).*?(?:Hier is|Hier zijn).*?(?=\n\n|###|\d+\.)/is,

                // English patterns (just in case)
                /^Absolutely!?\s*Here.*?(?=\n\n|$)/i,
                /^Of course!?\s*Here.*?(?=\n\n|$)/i,
                /^Sure!?\s*Here.*?(?=\n\n|$)/i
            ];

            let cleaned = content;
            for (const pattern of introPatterns) {
                cleaned = cleaned.replace(pattern, '');
            }

            // Remove leading whitespace
            return cleaned.trim();
        }

        function renderMarkdownContent(elementId, content) {
            if (!content) return;

            console.log(`🎨 Rendering ${elementId}...`);
            const element = document.getElementById(elementId);

            try {
                // Clean AI response before rendering
                const cleanedContent = cleanAIResponse(content);
                element.innerHTML = marked.parse(cleanedContent);
                console.log(`✅ Rendered ${elementId}`);
            } catch (error) {
                console.error(`❌ Error rendering ${elementId}:`, error);
                element.textContent = content;
            }
        }

        function renderRecruiterTipsChecklist(content) {
            if (!content) return;

            console.log('🎨 Rendering Recruiter Tips as checklist...');

            // Clean AI response before processing
            const cleanedContent = cleanAIResponse(content);

            // Store original content in hidden div
            const originalDiv = document.getElementById('recruiterTips');
            originalDiv.innerHTML = marked.parse(cleanedContent);

            // Parse content into checklist items
            const checklistContainer = document.getElementById('recruiterTipsChecklist');
            checklistContainer.innerHTML = '';

            // Split by headers (## or ###)
            const sections = cleanedContent.split(/(?=#{2,3}\s)/);
            let totalItems = 0;
            let sectionCounter = 0;

            sections.forEach((section, index) => {
                if (!section.trim()) return;

                // Extract header
                const headerMatch = section.match(/^#{2,3}\s+(.+?)$/m);
                const header = headerMatch ? headerMatch[1].trim() : `Categorie ${index + 1}`;

                // Extract list items - improved to handle multi-line bullets
                // Split section into lines and group bullet points
                const lines = section.split('\n');
                const items = [];
                let currentItem = '';

                for (let line of lines) {
                    if (line.match(/^[\*\-]\s+/)) {
                        // New bullet point - save previous if exists
                        if (currentItem) {
                            items.push(currentItem.trim());
                        }
                        currentItem = line;
                    } else if (currentItem && line.trim() && !line.match(/^#{1,3}\s/)) {
                        // Continuation of current bullet point
                        currentItem += ' ' + line.trim();
                    }
                }
                // Don't forget the last item
                if (currentItem) {
                    items.push(currentItem.trim());
                }

                if (items.length === 0) return;

                sectionCounter++;
                const sectionId = `tips-section-${sectionCounter}`;

                // Create section wrapper - PREMIUM STYLING
                const sectionDiv = document.createElement('div');
                sectionDiv.style.cssText = `
                    background: linear-gradient(135deg, #ffffff 0%, #fffbeb 50%, #fef3c7 100%);
                    border: 2px solid;
                    border-image: linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b) 1;
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(251, 191, 36, 0.15), 0 0 0 1px rgba(251, 191, 36, 0.1) inset;
                    position: relative;
                    overflow: hidden;
                    margin-bottom: 1rem;
                `;

                // Add premium glow effect
                const glowDiv = document.createElement('div');
                glowDiv.style.cssText = `
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%);
                    pointer-events: none;
                    z-index: 0;
                `;
                sectionDiv.appendChild(glowDiv);

                // Section header - CLICKABLE/COLLAPSIBLE
                const sectionHeader = document.createElement('button');
                sectionHeader.onclick = () => toggleTipsSection(sectionId);
                sectionHeader.style.cssText = `
                    width: 100%;
                    padding: 1.5rem 2rem;
                    font-size: 1.375rem;
                    font-weight: 800;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.75rem;
                    position: relative;
                    z-index: 1;
                    transition: all 0.3s ease;
                `;
                sectionHeader.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.5rem; filter: drop-shadow(0 2px 4px rgba(251,191,36,0.3));">💎</span>
                        <span style="background: linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fbbf24 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${header}</span>
                    </div>
                    <svg id="${sectionId}-icon" style="width: 1.5rem; height: 1.5rem; color: #f59e0b; transition: transform 0.3s ease; transform: rotate(0deg);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                    </svg>
                `;
                sectionDiv.appendChild(sectionHeader);

                // Checklist items container - COLLAPSIBLE
                const itemsContainer = document.createElement('div');
                itemsContainer.id = sectionId;
                itemsContainer.style.cssText = `
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    padding: 0 2rem;
                `;

                const itemsList = document.createElement('div');
                itemsList.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    position: relative;
                    z-index: 1;
                    padding-bottom: 2rem;
                `;

                items.forEach((item, itemIndex) => {
                    // Clean markdown bold syntax from text
                    let text = item.replace(/^[\*\-]\s+/, '').trim();
                    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

                    const itemId = `tip-${sectionCounter}-${itemIndex}`;
                    totalItems++;

                    // Premium gate after 8 free tips
                    if (totalItems === 9) {
                        const premiumGate = document.createElement('div');
                        premiumGate.style.cssText = `
                            padding: 2rem;
                            background: linear-gradient(135deg, #7c3aed 0%, #c026d3 100%);
                            border-radius: 16px;
                            color: white;
                            text-align: center;
                            box-shadow: 0 20px 60px rgba(124, 58, 237, 0.4);
                            position: relative;
                            overflow: hidden;
                            margin: 2rem 0;
                        `;

                        premiumGate.innerHTML = `
                            <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); pointer-events: none;"></div>

                            <div style="position: relative; z-index: 1;">
                                <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
                                <h3 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 0.75rem;">
                                    Unlock ${items.length - 8 + (sections.length - index - 1) * 6} Meer Premium Tips
                                </h3>
                                <p style="font-size: 1.125rem; opacity: 0.95; margin-bottom: 1.5rem; max-width: 500px; margin-left: auto; margin-right: auto;">
                                    Krijg toegang tot alle insider recruiter tips, STAR-vragen en interview strategieën speciaal voor deze functie
                                </p>

                                <div style="display: flex; gap: 1rem; justify-content: center; margin-bottom: 1.5rem; flex-wrap: wrap;">
                                    <div style="background: rgba(255,255,255,0.2); padding: 0.75rem 1.25rem; border-radius: 999px; backdrop-filter: blur(10px);">
                                        <span style="font-weight: 700;">✓</span> Volledige STAR vragenbank
                                    </div>
                                    <div style="background: rgba(255,255,255,0.2); padding: 0.75rem 1.25rem; border-radius: 999px; backdrop-filter: blur(10px);">
                                        <span style="font-weight: 700;">✓</span> Competentie vragen
                                    </div>
                                    <div style="background: rgba(255,255,255,0.2); padding: 0.75rem 1.25rem; border-radius: 999px; backdrop-filter: blur(10px);">
                                        <span style="font-weight: 700;">✓</span> Do's & Don'ts
                                    </div>
                                </div>

                                <button onclick="alert('Premium upgrade coming soon! Contact us for early access.')" style="
                                    background: white;
                                    color: #7c3aed;
                                    padding: 1rem 3rem;
                                    border-radius: 12px;
                                    font-size: 1.125rem;
                                    font-weight: 700;
                                    border: none;
                                    cursor: pointer;
                                    transition: all 0.3s;
                                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                                ">
                                    💎 Upgrade naar Premium - €9.99
                                </button>

                                <div style="margin-top: 1.5rem; font-size: 0.875rem; opacity: 0.8;">
                                    ⏰ Limited time: Get 30% off with code <strong style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.5rem; border-radius: 4px;">FIRSTJOB30</strong>
                                </div>
                            </div>
                        `;

                        itemsList.appendChild(premiumGate);
                        return; // Stop showing more items
                    }

                    const itemDiv = document.createElement('div');
                    itemDiv.style.cssText = `
                        display: flex;
                        align-items: flex-start;
                        gap: 1rem;
                        padding: 1.25rem;
                        background: linear-gradient(135deg, #ffffff 0%, #fefce8 100%);
                        border: 1.5px solid rgba(251, 191, 36, 0.2);
                        border-radius: 12px;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        cursor: pointer;
                        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.08);
                        position: relative;
                        overflow: hidden;
                    `;

                    // Add shine effect on hover
                    itemDiv.addEventListener('mouseenter', () => {
                        itemDiv.style.transform = 'translateY(-2px) scale(1.01)';
                        itemDiv.style.boxShadow = '0 8px 24px rgba(251, 191, 36, 0.2), 0 0 0 2px rgba(251, 191, 36, 0.15)';
                        itemDiv.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                    });

                    itemDiv.addEventListener('mouseleave', () => {
                        itemDiv.style.transform = '';
                        itemDiv.style.boxShadow = '0 2px 8px rgba(251, 191, 36, 0.08)';
                        itemDiv.style.borderColor = 'rgba(251, 191, 36, 0.2)';
                    });

                    // Checkbox - PREMIUM STYLING
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = itemId;
                    checkbox.style.cssText = `
                        width: 24px;
                        height: 24px;
                        margin-top: 0.125rem;
                        cursor: pointer;
                        accent-color: #f59e0b;
                        flex-shrink: 0;
                        filter: drop-shadow(0 2px 4px rgba(251, 191, 36, 0.2));
                        transition: all 0.2s ease;
                    `;
                    checkbox.addEventListener('change', function() {
                        updateTipsProgress();
                        // Celebrate checking items
                        if (this.checked) {
                            itemDiv.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
                            itemDiv.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                            label.style.color = '#166534';
                            label.style.textDecoration = 'line-through';
                            label.style.opacity = '0.6';
                        } else {
                            itemDiv.style.background = 'linear-gradient(135deg, #ffffff 0%, #fefce8 100%)';
                            itemDiv.style.borderColor = 'rgba(251, 191, 36, 0.2)';
                            label.style.color = '#374151';
                            label.style.textDecoration = 'none';
                            label.style.opacity = '1';
                        }
                    });

                    // Label - PREMIUM STYLING with HTML support
                    const label = document.createElement('label');
                    label.htmlFor = itemId;
                    label.style.cssText = `
                        font-size: 1rem;
                        line-height: 1.7;
                        color: #374151;
                        cursor: pointer;
                        flex: 1;
                        font-weight: 500;
                        transition: all 0.3s ease;
                    `;
                    label.innerHTML = text;

                    // Click on div checks checkbox
                    itemDiv.addEventListener('click', (e) => {
                        if (e.target !== checkbox && e.target.tagName !== 'LABEL') {
                            checkbox.checked = !checkbox.checked;
                            checkbox.dispatchEvent(new Event('change'));
                        }
                    });

                    itemDiv.appendChild(checkbox);
                    itemDiv.appendChild(label);
                    itemsList.appendChild(itemDiv);
                });

                itemsContainer.appendChild(itemsList);
                sectionDiv.appendChild(itemsContainer);
                checklistContainer.appendChild(sectionDiv);

                // Open first item by default
                if (sectionCounter === 1) {
                    setTimeout(() => toggleTipsSection(sectionId), 100);
                }
            });

            // Update total count
            document.getElementById('total-count').textContent = totalItems;
            updateTipsProgress();

            console.log(`✅ Rendered ${totalItems} checklist items in ${sectionCounter} sections`);
        }

        function toggleTipsSection(sectionId) {
            const content = document.getElementById(sectionId);
            const icon = document.getElementById(`${sectionId}-icon`);

            if (!content || !icon) return;

            if (content.style.maxHeight && content.style.maxHeight !== '0px') {
                // Collapse
                content.style.maxHeight = '0px';
                icon.style.transform = 'rotate(0deg)';
            } else {
                // Expand
                content.style.maxHeight = content.scrollHeight + 'px';
                icon.style.transform = 'rotate(180deg)';
            }
        }

        function updateTipsProgress() {
            const checkboxes = document.querySelectorAll('#recruiterTipsChecklist input[type="checkbox"]');
            const completed = Array.from(checkboxes).filter(cb => cb.checked).length;
            const total = checkboxes.length;

            document.getElementById('completed-count').textContent = completed;
            document.getElementById('total-count').textContent = total;

            // Change color when all completed
            const progressDiv = document.getElementById('tips-progress');
            if (completed === total && total > 0) {
                progressDiv.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                progressDiv.style.color = 'white';

                // Track completion in GA4
                if (window.trackEvent) {
                    window.trackEvent('all_tips_checked', {
                        total_tips: total
                    });
                }
            } else {
                progressDiv.style.background = 'white';
                progressDiv.style.color = '#f59e0b';
            }
        }

        async function downloadPDF() {
            // Check if user is premium
            const status = window.rateLimiter?.getStatus() || { unlimited: false };
            let serverStatus = { whitelisted: false, unlimited: false, devMode: false };

            try {
                const serverData = localStorage.getItem('rateLimitServerStatus');
                if (serverData) {
                    serverStatus = JSON.parse(serverData);
                }
            } catch (e) {
                console.error('Error parsing server status:', e);
            }

            // Check if in developer mode (server checks DEV_WHITELIST_IPS env variable)
            const isDevelopment = serverStatus.devMode || false;

            // In development mode, always use premium PDF generation
            const isPremium = isDevelopment || status.unlimited || serverStatus.whitelisted;

            // Track PDF download attempt
            if (window.trackEvent) {
                window.trackEvent('pdf_download_attempted', {
                    status: 'initiated',
                    user_type: isPremium ? 'premium' : 'free',
                    method: isPremium ? 'server_pdf' : 'browser_print',
                    is_dev: isDevelopment
                });
            }

            if (isPremium) {
                // PREMIUM: Server-side professional PDF
                await downloadProfessionalPDF();
            } else {
                // FREE: Browser print-to-PDF
                downloadBrowserPDF();
            }
        }

        async function downloadProfessionalPDF() {
            // Show loading message
            const loadingMsg = document.createElement('div');
            loadingMsg.id = 'pdf-loading';
            loadingMsg.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #6366F1, #8B5CF6); color: white; padding: 1.5rem 2.5rem; border-radius: 16px; box-shadow: 0 10px 40px rgba(99,102,241,0.4); z-index: 10000; font-weight: bold; text-align: center;';
            loadingMsg.innerHTML = '⚙️ Generating professional PDF...<br><small style="font-weight: normal; opacity: 0.9;">This will take a few seconds</small>';
            document.body.appendChild(loadingMsg);

            try {
                // Get analysis data from session storage
                const result = JSON.parse(sessionStorage.getItem('cvAnalysisResult') || '{}');
                const matchScore = extractMatchScore();

                // If no data, use demo data for testing (helpful for development/testing)
                const hasNoData = !result.changesOverview && !result.improvedCV;
                const useDemoData = hasNoData;

                // Prepare payload
                const payload = {
                    matchScore: matchScore || (useDemoData ? 85 : 75),
                    changesOverview: result.changesOverview || (useDemoData ? 'Demo: This is a sample CV analysis for testing the PDF generation.' : ''),
                    improvedCV: result.improvedCV || (useDemoData ? 'Demo Improved CV\n\nThis is sample improved CV text for testing PDF generation in developer mode.' : ''),
                    coverLetter: result.coverLetter || (useDemoData ? 'Demo Cover Letter\n\nDear Hiring Manager,\n\nThis is a sample cover letter for testing.' : ''),
                    recruiterTips: result.recruiterTips || (useDemoData ? 'Demo Recruiter Tips\n\n1. Keep your CV concise\n2. Use action verbs\n3. Quantify achievements' : ''),
                    isPremium: true,
                    language: result.language || 'nl'
                };

                console.log('📤 Sending PDF generation request...');

                // Call Netlify function
                const response = await fetch('/.netlify/functions/generate-pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`PDF generation failed: ${response.statusText}`);
                }

                // Get PDF blob
                const blob = await response.blob();
                console.log('📄 PDF received:', blob.size, 'bytes');

                // Trigger download
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `CV-Analysis-${Date.now()}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();

                // Success message
                loadingMsg.style.background = 'linear-gradient(135deg, #10B981, #059669)';
                loadingMsg.innerHTML = '✅ Professional PDF downloaded!<br><small style="font-weight: normal; opacity: 0.9;">Check your downloads folder</small>';

                setTimeout(() => loadingMsg.remove(), 3000);

                // Track success
                if (window.trackEvent) {
                    window.trackEvent('pdf_download_completed', {
                        method: 'server_pdf',
                        user_type: 'premium',
                        file_size: blob.size
                    });
                }

            } catch (error) {
                console.error('❌ PDF generation error:', error);

                // Error message
                loadingMsg.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';
                loadingMsg.innerHTML = '❌ PDF generation failed<br><small style="font-weight: normal; opacity: 0.9;">Falling back to browser print...</small>';

                setTimeout(() => {
                    loadingMsg.remove();
                    // Fallback to browser print
                    downloadBrowserPDF();
                }, 2000);

                // Track error
                if (window.trackEvent) {
                    window.trackEvent('pdf_download_error', {
                        error: error.message,
                        method: 'server_pdf'
                    });
                }
            }
        }

        function downloadBrowserPDF() {
            // Prepare page for print/PDF
            const elementsToHide = [
                'sticky-upgrade-bar',
                'sticky-download-btn',
                'exit-intent-popup',
                'feature-comparison',
                'testimonial-slider',
                'next-steps-cta',
                'faq-section',
                'progress-indicator',
                'last-upgrade-counter',
                'journey-cta'
            ];

            // Hide upgrade elements before printing
            const hiddenElements = [];
            elementsToHide.forEach(id => {
                const el = document.getElementById(id);
                if (el && el.style.display !== 'none') {
                    el.dataset.originalDisplay = el.style.display || '';
                    el.style.display = 'none';
                    hiddenElements.push(el);
                }
            });

            // Hide all unlock overlays
            document.querySelectorAll('.unlock-overlay').forEach(overlay => {
                overlay.dataset.originalDisplay = overlay.style.display || '';
                overlay.style.display = 'none';
                hiddenElements.push(overlay);
            });

            // Remove blur from locked content
            document.querySelectorAll('.blur-content').forEach(content => {
                content.dataset.originalFilter = content.style.filter || '';
                content.style.filter = 'none';
                hiddenElements.push(content);
            });

            // Show a helpful message
            const printMessage = document.createElement('div');
            printMessage.id = 'print-message';
            printMessage.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 1rem 2rem; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 10000; font-weight: bold; text-align: center;';
            printMessage.innerHTML = '📄 Print dialog opening...<br><small style="font-weight: normal;">Choose "Save as PDF" in the print dialog</small>';
            document.body.appendChild(printMessage);

            // Small delay to allow UI update
            setTimeout(() => {
                // Trigger print dialog
                window.print();

                // Restore elements after print dialog closes
                setTimeout(() => {
                    hiddenElements.forEach(el => {
                        if (el.classList && el.classList.contains('blur-content')) {
                            el.style.filter = el.dataset.originalFilter || '';
                        } else if (el.classList && el.classList.contains('unlock-overlay')) {
                            el.style.display = el.dataset.originalDisplay || '';
                        } else {
                            el.style.display = el.dataset.originalDisplay || '';
                        }
                    });

                    // Remove print message
                    const msg = document.getElementById('print-message');
                    if (msg) msg.remove();

                    // Track completion
                    if (window.trackEvent) {
                        window.trackEvent('pdf_download_completed', {
                            method: 'browser_print',
                            user_type: 'free'
                        });
                    }
                }, 1000);
            }, 100);
        }

        function extractMatchScore() {
            // Try to extract match score from the page
            const scoreText = document.querySelector('[id*="matchScore"]')?.textContent;
            if (scoreText) {
                const match = scoreText.match(/(\d+)%/);
                return match ? parseInt(match[1]) : null;
            }
            return null;
        }

        function copyCV() {
            const cvContent = document.getElementById('improvedCV').textContent;
            navigator.clipboard.writeText(cvContent).then(() => {
                // Track successful copy in GA4
                if (window.trackEvent) {
                    window.trackEvent('cv_copied', {
                        content_length: cvContent.length
                    });
                }

                // Show success message
                const button = event.target.closest('button');
                const originalHTML = button.innerHTML;
                button.innerHTML = '<span class="text-2xl">✅</span> Gekopieerd!';
                button.classList.add('bg-green-600', 'hover:bg-green-700');
                button.classList.remove('bg-blue-600', 'hover:bg-blue-700');

                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.classList.remove('bg-green-600', 'hover:bg-green-700');
                    button.classList.add('bg-blue-600', 'hover:bg-blue-700');
                }, 2000);
            }).catch(err => {
                console.error('❌ Error copying:', err);

                // Track copy error in GA4
                if (window.trackEvent) {
                    window.trackEvent('cv_copy_error', {
                        error_message: err.message
                    });
                }

                alert('❌ Kon CV niet kopiëren');
            });
        }

        /**
         * Scroll to interview questions section
         */
        function scrollToInterview() {
            const interviewSection = document.getElementById('interview-section');

            if (interviewSection) {
                // Calculate position with offset for better visibility
                const offset = 100; // pixels from top
                const elementPosition = interviewSection.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - offset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Expand the section if it's collapsed
                setTimeout(() => {
                    const tipsContent = document.getElementById('tips-content');
                    if (tipsContent && tipsContent.style.maxHeight === '0px') {
                        toggleMainSection('tips');
                    }
                }, 300);

                // Track in GA4
                if (window.trackEvent) {
                    window.trackEvent('interview_section_viewed', {
                        source: 'button_click'
                    });
                }
            }
        }

        // ============================================
        // LANGUAGE TRANSLATION FUNCTIONALITY
        // ============================================

        let currentLanguage = 'nl'; // Default: Dutch
        let originalContent = {}; // Store original content
        let translatedContent = {}; // Store translated content

        // Save original content on page load
        window.addEventListener('DOMContentLoaded', () => {
            saveOriginalContent();
        });

        function saveOriginalContent() {
            originalContent = {
                title: document.getElementById('mainTitle')?.textContent,
                cv: document.getElementById('improvedCV')?.innerHTML,
                cover: document.getElementById('coverLetter')?.innerHTML,
                tips: document.getElementById('recruiterTips')?.innerHTML,
                changes: document.getElementById('changesOverview')?.innerHTML
            };
            console.log('💾 Original content saved');
        }

        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-semibold z-50 transition-all duration-300 ${
                type === 'success' ? 'bg-green-500' :
                type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`;
            notification.textContent = message;
            notification.style.transform = 'translateY(100px)';
            notification.style.opacity = '0';

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.transform = 'translateY(0)';
                notification.style.opacity = '1';
            }, 10);

            setTimeout(() => {
                notification.style.transform = 'translateY(100px)';
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        // ============================================
        // EMAIL CAPTURE MODAL FUNCTIONALITY
        // ============================================

        function openEmailModal() {
            const modal = document.getElementById('emailModal');
            modal.classList.remove('hidden');
            // Reset form if previously submitted
            document.getElementById('emailCaptureForm').classList.remove('hidden');
            document.getElementById('emailSuccess').classList.add('hidden');
        }

        function closeEmailModal() {
            const modal = document.getElementById('emailModal');
            modal.classList.add('hidden');
            // Reset form
            document.getElementById('emailCaptureForm').reset();
        }

        async function submitEmail(event) {
            event.preventDefault();

            const email = document.getElementById('userEmail').value;
            const name = document.getElementById('userName').value;
            const newsletter = document.getElementById('newsletter').checked;

            // Get CV results from sessionStorage
            const data = sessionStorage.getItem('cvAnalysisResult');
            if (!data) {
                showNotification('❌ No results found. Please analyze your CV first.', 'error');
                return;
            }

            const result = JSON.parse(data);

            // Show loading state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '⏳ Sending...';
            submitBtn.disabled = true;

            try {
                // Call Netlify function to send email
                const response = await fetch('/.netlify/functions/send-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        name,
                        newsletter,
                        cvResults: {
                            improvedCV: result.improvedCV,
                            coverLetter: result.coverLetter,
                            recruiterTips: result.recruiterTips,
                            changesOverview: result.changesOverview
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to send email');
                }

                // Show success message
                document.getElementById('emailCaptureForm').classList.add('hidden');
                document.getElementById('emailSuccess').classList.remove('hidden');

                // Save email to localStorage for future use
                localStorage.setItem('userEmail', email);
                if (name) localStorage.setItem('userName', name);

                showNotification('✅ Results sent to your inbox!', 'success');

            } catch (error) {
                console.error('❌ Email send error:', error);
                showNotification('❌ Failed to send email. Please try again.', 'error');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }

        // Close modal when clicking outside
        document.getElementById('emailModal')?.addEventListener('click', function(e) {
            if (e.target.id === 'emailModal') {
                closeEmailModal();
            }
        });

        // ============================================
        // COLLAPSIBLE SECTION FUNCTIONALITY
        // ============================================

        // ============================================
        // COVER LETTER ACTIONS
        // ============================================

        function copyCoverLetter() {
            const coverLetterDiv = document.getElementById('coverLetter');
            const text = coverLetterDiv.innerText;

            navigator.clipboard.writeText(text).then(() => {
                showNotification('✅ Aanbevelingsbrief gekopieerd!', 'success');

                // Track in GA4
                if (window.trackEvent) {
                    window.trackEvent('cover_letter_copied', {});
                }
            }).catch(err => {
                console.error('Failed to copy:', err);
                showNotification('❌ Kopiëren mislukt. Probeer opnieuw.', 'error');
            });
        }

        function downloadCoverLetterPDF() {
            // For now, we'll create a simple text download
            // In the future, this could use jsPDF for proper PDF generation
            const coverLetterDiv = document.getElementById('coverLetter');
            const text = coverLetterDiv.innerText;

            // Create blob
            const blob = new Blob([text], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);

            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = 'aanbevelingsbrief.txt';
            document.body.appendChild(a);
            a.click();

            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showNotification('✅ Aanbevelingsbrief gedownload!', 'success');

            // Track in GA4
            if (window.trackEvent) {
                window.trackEvent('cover_letter_downloaded', {
                    format: 'txt'
                });
            }
        }

        // ============================================
        // SECTION TOGGLE
        // ============================================

        function toggleMainSection(sectionName) {
            const content = document.getElementById(`${sectionName}-content`);
            const icon = document.getElementById(`${sectionName}-icon`);
            const header = content.previousElementSibling;

            if (content.classList.contains('expanded')) {
                // Collapse
                content.classList.remove('expanded');
                icon.classList.remove('rotated');
                header.classList.remove('active');
            } else {
                // Expand
                content.classList.add('expanded');
                icon.classList.add('rotated');
                header.classList.add('active');
            }
        }

        // ============================================
        // COOKIE CONSENT FUNCTIONALITY
        // ============================================

        function checkCookieConsent() {
            const consent = localStorage.getItem('cookieConsent');
            const banner = document.getElementById('cookieConsent');

            if (!consent) {
                setTimeout(() => {
                    banner.classList.add('show');
                }, 1000);
            }
        }

        function acceptCookies() {
            localStorage.setItem('cookieConsent', 'accepted');
            localStorage.setItem('cookieConsentDate', new Date().toISOString());
            document.getElementById('cookieConsent').classList.remove('show');
            showNotification('✅ Cookie preferences saved', 'success');
        }

        function declineCookies() {
            localStorage.setItem('cookieConsent', 'declined');
            localStorage.setItem('cookieConsentDate', new Date().toISOString());
            document.getElementById('cookieConsent').classList.remove('show');
            showNotification('✅ Cookie preferences saved', 'success');
        }

        document.addEventListener('DOMContentLoaded', checkCookieConsent);
