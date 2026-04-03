/**
 * ReferencesSection - LENR Theory Paper references list
 */
import React from 'react';
import { Typography, Box, List, ListItem, Divider, Alert, AlertTitle } from '@mui/material';
import { Link as MuiLink } from '@mui/material';

export default function ReferencesSection() {
  return (<><Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            References
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 3 }}>
            Comprehensive list of source materials, theoretical foundations, and experimental validations referenced 
            throughout this unified LENR framework. All links open in a new tab.
          </Typography>
          
          <List>
            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [1] Fleischmann, M. & Pons, S. (1989)
              </Typography>
              <Typography variant="body2" paragraph>
                Electrochemically Induced Nuclear Fusion of Deuterium. <em>Journal of Electroanalytical Chemistry</em>, 261(2), 301-308.
              </Typography>
              <MuiLink 
                href="https://doi.org/10.1016/0022-0728(89)80006-3" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                DOI: 10.1016/0022-0728(89)80006-3
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [2] Gamow, G. (1928)
              </Typography>
              <Typography variant="body2" paragraph>
                Zur Quantentheorie des Atomkernes [On the Quantum Theory of Atomic Nuclei]. <em>Zeitschrift für Physik</em>, 51(3-4), 204-212.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [3] Hagelstein, P. L., Chaudhary, I. U., & McKubre, M. C. H. (2015)
              </Typography>
              <Typography variant="body2" paragraph>
                Coherent Energy Exchange Between Lattice and Nuclear Degrees of Freedom. <em>Journal of Condensed Matter Nuclear Science</em>, 15, 1-24.
              </Typography>
              <MuiLink 
                href="https://www.lenr-canr.org/acrobat/HagelsteinPcoherenten.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                Full Text (LENR-CANR.org)
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [4] Storms, E. (2007)
              </Typography>
              <Typography variant="body2" paragraph>
                <em>The Science of Low Energy Nuclear Reaction: A Comprehensive Compilation of Evidence and Explanations About Cold Fusion</em>. World Scientific Publishing Company.
              </Typography>
              <MuiLink 
                href="https://www.worldscientific.com/worldscibooks/10.1142/6420" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                World Scientific (ISBN: 978-981-270-620-1)
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [5] Holmlid, L. (2009, 2017)
              </Typography>
              <Typography variant="body2" paragraph>
                Rydberg Matter and Mesoscopic Physics. Multiple papers on ultra-dense hydrogen and Rydberg Matter states.
              </Typography>
              <MuiLink 
                href="https://doi.org/10.1016/j.ijhydene.2017.07.180" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                Recent Work: International Journal of Hydrogen Energy
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [6] Widom, A. & Larsen, L. (2006)
              </Typography>
              <Typography variant="body2" paragraph>
                Ultra Low Momentum Neutron Catalyzed Nuclear Reactions on Metallic Hydride Surfaces. <em>European Physical Journal C</em>, 46(1), 107-111.
              </Typography>
              <MuiLink 
                href="https://doi.org/10.1140/epjc/s2006-02479-8" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                DOI: 10.1140/epjc/s2006-02479-8
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [7] Casimir, H. B. G. (1948)
              </Typography>
              <Typography variant="body2" paragraph>
                On the attraction between two perfectly conducting plates. <em>Proceedings of the Koninklijke Nederlandse Akademie van Wetenschappen</em>, 51(7), 793-795.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [8] McKubre, M. C. H. et al. (1994)
              </Typography>
              <Typography variant="body2" paragraph>
                Excess power observations in electrochemical studies of the D/Pd system. <em>Journal of Electroanalytical Chemistry</em>, 368(1-2), 55-66.
              </Typography>
              <MuiLink 
                href="https://doi.org/10.1016/0022-0728(94)87098-5" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                DOI: 10.1016/0022-0728(94)87098-5
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [9] Mizuno, T. & Rothwell, J. (2019)
              </Typography>
              <Typography variant="body2" paragraph>
                Increased Excess Heat from Palladium Deposited on Nickel. <em>Journal of Condensed Matter Nuclear Science</em>, 29, 1-30.
              </Typography>
              <MuiLink 
                href="https://www.lenr-canr.org/acrobat/MizunoTincreasedexc.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                Full Text (LENR-CANR.org)
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [10] Arata, Y. & Zhang, Y. C. (2002)
              </Typography>
              <Typography variant="body2" paragraph>
                Observation of anomalous heat release and helium-4 production from highly deuterated palladium. <em>Proceedings of the Japan Academy, Series B</em>, 78(7), 57-61.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [11] Levi, G. et al. (2013)
              </Typography>
              <Typography variant="body2" paragraph>
                Indications of anomalous heat energy production in a reactor device containing hydrogen loaded nickel powder. <em>arXiv preprint</em>.
              </Typography>
              <MuiLink 
                href="https://arxiv.org/abs/1305.3913" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                arXiv:1305.3913 [physics.gen-ph]
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [12] Fralick, G., Decher, R., & Rousar, D. (2003)
              </Typography>
              <Typography variant="body2" paragraph>
                Anomalous Heat Effects in Metal Hydrides. <em>NASA Glenn Research Center Technical Report</em>.
              </Typography>
              <MuiLink 
                href="https://ntrs.nasa.gov/api/citations/20030060580/downloads/20030060580.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                NASA Technical Report (NTRS)
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [13] Schwinger, J. (1990)
              </Typography>
              <Typography variant="body2" paragraph>
                Cold Fusion: A Hypothesis. <em>Zeitschrift für Naturforschung A</em>, 45(7), 756-758.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [14] Miley, G. H. & Patterson, J. A. (1996)
              </Typography>
              <Typography variant="body2" paragraph>
                Evidence of Transmutation Products in Thin-Film Nickel. <em>Fusion Technology</em>, 30(1), 156-159.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [15] Takahashi, A. (2004)
              </Typography>
              <Typography variant="body2" paragraph>
                Tetrahedral Symmetric Condensate Fusion Model and Multi-body Fusion in Deuterated Metal. <em>Journal of Condensed Matter Nuclear Science</em>, 1, 4-17.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [16] Storms, E. (2010)
              </Typography>
              <Typography variant="body2" paragraph>
                A critical analysis of the LENR phenomenon. <em>Naturwissenschaften</em>, 97(10), 861-881.
              </Typography>
              <MuiLink 
                href="https://doi.org/10.1007/s00114-010-0691-x" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                DOI: 10.1007/s00114-010-0691-x
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [17] Preparata, G. (1995)
              </Typography>
              <Typography variant="body2" paragraph>
                <em>QED Coherence in Matter</em>. World Scientific Publishing Company.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [18] Acs, D. et al. (2025)
              </Typography>
              <Typography variant="body2" paragraph>
                A Unified Theoretical Framework for Low-Energy Nuclear Reactions: Integrating Quantum, Nuclear, and Condensed Matter Phenomena. <em>Conscious Energies</em>.
              </Typography>
              <MuiLink 
                href="https://github.com/ConsciousEnergy/lenr_sim_app/blob/main/docs/A%20Unified%20Theoretical%20Framework%20for%20Low-Energy%20Nuclear%20Reactions_%20Integrating%20Quantum%2C%20Nuclear%2C%20and%20Condensed%20Matter%20Phenomena%20(1).md" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                Full Paper on GitHub
              </MuiLink>
            </ListItem>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2, mb: 2 }}>
              Computational Flow Visualization References
            </Typography>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [A1] Wang, S., Zhou, J., Feng, F., Li, Z., Sun, Y., Chen, D., Turk, G., & Zhu, B. (2025)
              </Typography>
              <Typography variant="body2" paragraph>
                Fluid Simulation on Vortex Particle Flow Maps (VPFM). <em>ACM Transactions on Graphics (SIGGRAPH 2025)</em>.
              </Typography>
              <MuiLink
                href="https://arxiv.org/pdf/2505.21946"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem', mr: 2 }}
              >
                arXiv:2505.21946
              </MuiLink>
              <MuiLink
                href="https://github.com/pfm-gatech/VPFM"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                VPFM GitHub Repository
              </MuiLink>
            </ListItem>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2, mb: 2 }}>
              Extended Theory Module References
            </Typography>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [19] Oppenheimer, J. R. & Phillips, M. (1935)
              </Typography>
              <Typography variant="body2" paragraph>
                Note on the Transmutation Function for Deuterons. <em>Physical Review</em>, 48(6), 500-502.
              </Typography>
              <MuiLink 
                href="https://doi.org/10.1103/PhysRev.48.500" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                DOI: 10.1103/PhysRev.48.500
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [20] Storms, E. (2014)
              </Typography>
              <Typography variant="body2" paragraph>
                <em>The Explanation of Low Energy Nuclear Reaction: An Examination of the Relationship Between Observation and Explanation</em>. Infinite Energy Press. Introduces the Hydroton model and Nuclear Active Environment (NAE) theory.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [21] Vysotskii, V. I., Adamenko, S. V., & Vysotskyy, M. V. (2012)
              </Typography>
              <Typography variant="body2" paragraph>
                Coherent correlated states of interacting particles — the possible key to paradoxes and features of LENR. <em>Current Science</em>, 108(4), 30-36.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [22] Swartz, M. (2012)
              </Typography>
              <Typography variant="body2" paragraph>
                NANOR-type CF/LANR Components and the Optimal Operating Point Manifold. <em>Journal of Condensed Matter Nuclear Science</em>, 6, 1-18. Demonstrated at MIT IAP courses.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [23] Miles, M. H. & Bush, B. F. (1994)
              </Typography>
              <Typography variant="body2" paragraph>
                Heat and Helium Measurements in Deuterated Palladium. <em>Transactions of Fusion Technology</em>, 26(4T), 156-159. Established the heat-helium correlation at ~2.6 × 10¹¹ He-4 atoms/s per watt.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [24] Matsumoto, T. (1995)
              </Typography>
              <Typography variant="body2" paragraph>
                Electro-Nuclear Collapse and the Formation of Nuclear Products. <em>Fusion Technology</em>, 27, 194-206.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [25] Chubb, S. R. & Chubb, T. A. (1994)
              </Typography>
              <Typography variant="body2" paragraph>
                Ion Band State Fusion. <em>Fusion Technology</em>, 24(4), 403-415. Bloch-symmetric quantum states for deuterons in periodic lattice potentials.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [26] Piantelli, F. (2010)
              </Typography>
              <Typography variant="body2" paragraph>
                Nickel-Hydrogen Exothermal Reactions. <em>Patent WO2010058288A1</em>. Proton absorption in nickel at 400–700 K producing anomalous heat.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [27] Iwamura, Y. et al. (2002)
              </Typography>
              <Typography variant="body2" paragraph>
                Elemental Analysis of Pd Complexes: Effects of D₂ Gas Permeation. <em>Japanese Journal of Applied Physics</em>, 41(7A), 4642-4650. Selective nuclear transmutation via Pd/CaO/Pd multilayer structures.
              </Typography>
              <MuiLink 
                href="https://doi.org/10.1143/JJAP.41.4642" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                DOI: 10.1143/JJAP.41.4642
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [28] Letts, D. & Cravens, D. (2006)
              </Typography>
              <Typography variant="body2" paragraph>
                Laser Stimulation of Deuterated Palladium: Past and Present. <em>Proceedings of the 10th International Conference on Cold Fusion (ICCF-10)</em>. Dual-laser beat-frequency triggering of excess heat via phonon-mode coupling.
              </Typography>
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />
          
          <Alert severity="info">
            <AlertTitle><strong>Additional Resources</strong></AlertTitle>
            <Typography variant="body2" paragraph>
              For comprehensive LENR research archives, visit:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <MuiLink href="https://www.lenr-canr.org" target="_blank" rel="noopener noreferrer">
                LENR-CANR.org - Cold Fusion Archive
              </MuiLink>
              <MuiLink href="https://www.lenr-forum.com/" target="_blank" rel="noopener noreferrer">
                LENR Forum - Low Energy Nuclear Reactions Community
              </MuiLink>
            </Box>
          </Alert>
  </>);}