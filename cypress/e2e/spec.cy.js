describe('Large Data Request Test', () => {
  it('should handle intercepted request with over 100MB of data', () => {
    // Generate large data payload (over 100MB)
    const generateLargeData = () => {
      const chunkSize = 1024 * 1024; 
      const totalChunks = 120; 
      const largeArray = [];
      
      for (let i = 0; i < totalChunks; i++) {
        const chunk = 'x'.repeat(chunkSize);
        largeArray.push({
          id: i,
          data: chunk,
          timestamp: Date.now(),
          chunkNumber: i
        });
      }
      
      return {
        payload: largeArray,
        metadata: {
          totalSize: totalChunks * chunkSize,
          chunkCount: totalChunks,
          generatedAt: new Date().toISOString()
        }
      };
    };

    const largeDataPayload = generateLargeData();
    
    cy.intercept('POST', '**', {
      statusCode: 200,
      body: largeDataPayload,
      headers: {
        'content-type': 'application/json',
        'x-data-size': largeDataPayload.metadata.totalSize.toString()
      }
    }).as('largeDataRequest');


    cy.visit('example.cypress.io');
    
    cy.window().then((win) => {

      return win.fetch('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: 'data' })
      })
      .then(response => response.json())
      .then(data => {
        // Store the result on the window for Cypress to access
        win.testResult = data;
        return data;
      });
    });


    cy.wait('@largeDataRequest').then((interception) => {

      expect(interception.response.statusCode).to.eq(200);
      
      expect(interception.response.body.metadata.totalSize).to.be.greaterThan(100 * 1024 * 1024); // > 100MB
      expect(interception.response.body.payload).to.have.length(120); // 120 chunks
      
      // Log the actual size for debugging
      cy.log(`Intercepted data size: ${interception.response.body.metadata.totalSize} bytes`);
      cy.log(`Intercepted data size in MB: ${(interception.response.body.metadata.totalSize / (1024 * 1024)).toFixed(2)}MB`);
    });

    // Verify the data was received correctly
    cy.window().its('testResult.metadata.totalSize').should('be.greaterThan', 100 * 1024 * 1024);
  });
});