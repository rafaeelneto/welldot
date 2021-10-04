import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

// @ts-ignore
import textures from 'textures';

import { APIPost, API_ENDPOINTS } from '../../utils/fetchAPI';

import styles from './perfilDrawer.module.scss';

type PDProps = {
  perfil: any;
  dimensions: {
    MARGINS: {
      TOP: number;
      RIGHT: number;
      BOTTOM: number;
      LEFT: number;
    };
    HEIGHT: number;
    WIDTH: number;
  };
};

const PerfilDrawer = ({ perfil, dimensions }: PDProps) => {
  const svgContainer = useRef(null);

  const { MARGINS, HEIGHT, WIDTH } = dimensions;

  const tooltip = d3
    .select('body')
    .append('div')
    .attr('class', styles.tooltip)
    .style('opacity', 0);

  useEffect(
    () => {
      if (!svgContainer.current) return;
      if (!perfil.construtivo || !perfil.geologico) return;

      const noPerfil =
        perfil.geologico.length === 0 &&
        perfil.construtivo.furo.length === 0 &&
        perfil.construtivo.espaco_anelar.length === 0 &&
        perfil.construtivo.revestimento.length === 0 &&
        perfil.construtivo.filtros.length === 0;

      if (noPerfil) return;

      function responsivefy(svg) {
        // container will be the DOM element
        // that the svg is appended to
        // we then measure the container
        // and find its aspect ratio
        const container = d3.select(svg.node().parentNode);

        const width = svg.style('width');
        const height = svg.style('height');

        // set viewBox attribute to the initial size
        // control scaling with preserveAspectRatio
        // resize svg on inital page load
        svg
          .attr('viewBox', `0 0 ${width} ${height}`)
          .attr('preserveAspectRatio', 'xMinYMid')
          .call(resize);

        // add a listener so the chart will be resized
        // when the window resizes
        // multiple listeners for the same event type
        // requires a namespace, i.e., 'click.foo'
        // api docs: https://goo.gl/F3ZCFr
        d3.select(window).on('resize.' + container.attr('id'), resize);

        // this is the code that resizes the chart
        // it will be called on load
        // and in response to window resizes
        // gets the width of the container
        // and resizes the svg to fill it
        // while maintaining a consistent aspect ratio
        function resize() {
          const h = parseInt(container.style('height').slice(0, -2));
          const w = parseInt(container.style('width').slice(0, -2));

          svg.attr('width', w);
          svg.attr('height', h);
        }
      }

      const profileTexture = {
        cimento: textures.lines().thicker().background('#ffffff'),
        pre_filtro: textures.circles().complement().background('#ffffff'),
        filtros: textures
          .paths()
          .d((s) => `M ${s / 4} ${s / 4} l ${s / 2} 0 `)
          .size(40)
          .strokeWidth(2)
          .thicker(2)
          .background('#fff'),
      };

      const svg = d3
        .select(svgContainer.current)
        .attr('height', HEIGHT + MARGINS.TOP + MARGINS.BOTTOM)
        .attr('width', WIDTH + MARGINS.LEFT + MARGINS.RIGHT)
        .call(responsivefy);

      svg.selectAll('*').remove();

      const litoligicalGroup = svg
        .append('g')
        .attr('transform', `translate(${MARGINS.LEFT}, ${MARGINS.TOP})`);

      const constructionGroup = svg.append('g');

      let yScale: any = {};

      const svgWidth: any = d3.select(svgContainer.current).attr('width');

      const POCO_WIDTH = svgWidth / 4;
      const POCO_CENTER = (svgWidth * 3) / 4;

      const plotGeology = async (data) => {
        const litologicalFill = {};

        const texturesToFetch: number[] = [];
        data.forEach((element) => {
          const texture: number = element.fgdc_texture;
          if (texturesToFetch.indexOf(texture) < 0) {
            texturesToFetch.push(texture);
          }
        });

        const texturesToFetchJSON = JSON.stringify({
          textures: texturesToFetch,
        });

        // ! IMPROVE ERROR HANDLING ON API CALL

        const res = await APIPost(
          API_ENDPOINTS.FGDC_TEXTURES,
          texturesToFetchJSON
        );

        const { data: dataFetch, status } = await res;

        if (dataFetch && dataFetch.data) {
          data.forEach((d: any) => {
            litologicalFill[`${d.fgdc_texture}.${d.de}`] = textures
              .paths()
              .d((s) => dataFetch.data[d.fgdc_texture])
              .size(150)
              .strokeWidth(0.8)
              .stroke('#303030')
              .background(d.color);
          });
        } else {
          data.forEach((d: any) => {
            litologicalFill[`${d.fgdc_texture}.${d.de}`] = d.color;
          });
        }

        const rects = litoligicalGroup.selectAll('rect').data(data);

        rects.exit().remove();

        rects
          .enter()
          .append('rect')
          .attr('x', POCO_CENTER)
          .attr('y', (d: any, i) => {
            if (i === 0) return yScale(d.de);
            return yScale(data[i - 1].ate);
          })
          .attr('x', 10)
          .attr('width', POCO_CENTER)
          .attr('height', (d: any) => yScale(d.ate - d.de))
          .style('fill', (d: any) => {
            if (!litologicalFill[`${d.fgdc_texture}.${d.de}`].url) {
              return litologicalFill[`${d.fgdc_texture}.${d.de}`];
            }
            svg.call(litologicalFill[`${d.fgdc_texture}.${d.de}`]);
            return litologicalFill[`${d.fgdc_texture}.${d.de}`].url();
          })
          .style('stroke', '#101010')
          .style('stroke-width', '1px')
          .on('mouseover', (event, d: any) => {
            tooltip.transition().duration(200).style('opacity', 1);
            tooltip
              .html(
                `
                <span class="${styles.title}">Litologia</span>
                <span class="${styles.primaryInfo}">De ${d.de} m até ${d.ate} m</span>
                <span class="${styles.secondaryInfo}"><strong>Descrição:</strong> ${d.descricao}</span>
              `
              )
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY + 10}px`);
          })
          .on('mouseout', (event, d: any) => {
            tooltip
              .transition()
              .duration(200)
              .style('opacity', 0)
              .attr('display', 'hidden')
              .attr('visibility', 'hidden');
          });
      };

      const plotPoco = (data) => {
        constructionGroup.attr(
          'transform',
          `translate(${MARGINS.LEFT + WIDTH / 2}, ${MARGINS.TOP})`
        );

        const maxXValues = [
          ...data.furo.map(
            (d: any) =>
              // divide by 1 to convert text to number
              // eslint-disable-next-line implicit-arrow-linebreak
              parseFloat(d.diam_pol)
            // eslint-disable-next-line function-paren-newline
          ),
          ...data.espaco_anelar.map((d: any) => parseFloat(d.diam_pol)),
          ...data.filtros.map((d: any) => parseFloat(d.diam_pol)),
          ...data.revestimento.map((d: any) => parseFloat(d.diam_pol)),
        ];

        const xScale = d3
          .scaleLinear()
          .domain([0, d3.max(maxXValues)])
          .range([0, POCO_WIDTH]);

        constructionGroup
          .append('rect')
          .attr(
            'x',
            (POCO_CENTER - xScale((data.laje.largura * 39.37) / 4)) / 2
          )
          .attr('y', -yScale(data.laje.espessura * 10))
          .attr('width', xScale((data.laje.largura * 39.37) / 4))
          .attr('height', yScale(data.laje.espessura * 10))
          .style('fill', '#fff')
          .style('stroke', '#303030')
          .style('stroke-width', '2px')
          .on('mouseover', (event, d: any) => {
            tooltip.transition().duration(200).style('opacity', 1);
            tooltip
              .html(
                `
                <span class="${styles.title}">LAJE DE PROTEÇÃO</span>
                <span class="${styles.primaryInfo}">${data.laje.tipo}</span>
                <span class="${styles.secondaryInfo}"><strong>Espessura:</strong> ${data.laje.espessura} m</span>
                <span class="${styles.secondaryInfo}"><strong>Largura:</strong> ${data.laje.largura} m</span>
                <span class="${styles.secondaryInfo}"><strong>Comprimento:</strong> ${data.laje.comprimento} m</span>
              `
              )
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY + 10}px`);
          })
          .on('mouseout', (event, d: any) => {
            tooltip
              .transition()
              .duration(200)
              .style('opacity', 0)
              .attr('display', 'hidden')
              .attr('visibility', 'hidden');
          });

        const furoGroup = constructionGroup.append('g');

        const furo = furoGroup.selectAll('rect').data(data.furo);

        furo
          .enter()
          .append('rect')
          .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2)
          .attr('y', (d: any, i) => {
            if (i === 0) return yScale(d.de);
            return yScale(data.furo[i - 1].ate);
          })
          .attr('width', (d: any) => xScale(d.diam_pol))
          .attr('height', (d: any) => yScale(d.ate - d.de))
          .style('fill', '#fff')
          .style('stroke', '#303030')
          .style('stroke-width', '1px')
          .on('mouseover', (event, d: any) => {
            tooltip.transition().duration(200).style('opacity', 1);
            tooltip
              .html(
                `
                <span class="${styles.title}">FURO</span>
                <span class="${styles.primaryInfo}">De ${d.de} m até ${d.ate} m</span>
                <span class="${styles.secondaryInfo}"><strong>Diâmetro:</strong>${d.diam_pol}"</span>
              `
              )
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY + 10}px`);
          })
          .on('mouseout', (event, d: any) => {
            tooltip
              .transition()
              .duration(200)
              .style('opacity', 0)
              .attr('display', 'hidden')
              .attr('visibility', 'hidden');
          });

        const espAnelaGroup = constructionGroup.append('g');

        const espAnelar = espAnelaGroup
          .selectAll('rect')
          .data(data.espaco_anelar);

        espAnelar
          .enter()
          .append('rect')
          .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2)
          .attr('y', (d: any, i) => {
            if (i === 0) return yScale(d.de);
            return yScale(data.espaco_anelar[i - 1].ate);
          })
          .attr('width', (d: any) => xScale(d.diam_pol))
          .attr('height', (d: any) => yScale(d.ate - d.de))
          .style('fill', (d: any) => {
            svg.call(profileTexture[d.tipo]);
            return profileTexture[d.tipo].url();
          })
          .style('stroke', '#303030')
          .style('stroke-width', '2px')
          .on('mouseover', (event, d: any) => {
            tooltip.transition().duration(200).style('opacity', 1);
            tooltip
              .html(
                `
                <span class="${styles.title}">ESP. ANELAR</span>
                <span class="${styles.primaryInfo}">De ${d.de} m até ${d.ate} m</span>
                <span class="${styles.secondaryInfo}"><strong>Diâmetro:</strong>${d.diam_pol}"</span>
                <span class="${styles.secondaryInfo}"><strong>Descrição:</strong> ${d.descricao}</span>
              `
              )
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY + 10}px`);
          })
          .on('mouseout', (event, d: any) => {
            tooltip
              .transition()
              .duration(200)
              .style('opacity', 0)
              .attr('display', 'hidden')
              .attr('visibility', 'hidden');
          });

        const revestGroup = constructionGroup.append('g');

        const revest = revestGroup.selectAll('rect').data(data.revestimento);

        revest
          .enter()
          .append('rect')
          .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2)
          .attr('y', (d: any, i) => {
            if (i === 0) return yScale(d.de) - 20;
            return yScale(d.de);
          })
          .attr('width', (d: any) => xScale(d.diam_pol))
          .attr('height', (d: any, i) => {
            if (i === 0) return yScale(d.ate - d.de) + 20;
            return yScale(d.ate - d.de);
          })
          .style('fill', '#fff')
          .style('stroke', '#303030')
          .style('stroke-width', '2px')
          .on('mouseover', (event, d: any) => {
            tooltip.transition().duration(200).style('opacity', 1);
            tooltip
              .html(
                `
                <span class="${styles.title}">REVESTIMENTO</span>
                <span class="${styles.primaryInfo}">De ${d.de} m até ${d.ate} m</span>
                <span class="${styles.secondaryInfo}"><strong>Diâmetro:</strong> ${d.diam_pol}"</span>
                <span class="${styles.secondaryInfo}"><strong>Tipo:</strong> ${d.tipo}</span>
              `
              )
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY + 10}px`);
          })
          .on('mouseout', (event, d: any) => {
            tooltip
              .transition()
              .duration(200)
              .style('opacity', 0)
              .attr('display', 'hidden')
              .attr('visibility', 'hidden');
          });

        const filtrosGroup = constructionGroup.append('g');

        const filtros = filtrosGroup.selectAll('rect').data(data.filtros);

        filtros
          .enter()
          .append('rect')
          .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2)
          .attr('y', (d: any, i) => {
            return yScale(d.de);
          })
          .attr('width', (d: any) => xScale(d.diam_pol))
          .attr('height', (d: any) => yScale(d.ate - d.de))
          .style('fill', (d: any) => {
            svg.call(profileTexture.filtros);
            return profileTexture.filtros.url();
          })
          .style('stroke', '#303030')
          .style('stroke-width', '2px')
          .on('mouseover', (event, d: any) => {
            tooltip.transition().duration(200).style('opacity', 1);
            tooltip
              .html(
                `
                <span class="${styles.title}">FILTROS</span>
                <span class="${styles.primaryInfo}">De ${d.de} m até ${d.ate} m</span>
                <span class="${styles.secondaryInfo}"><strong>Diâmetro:</strong> ${d.diam_pol}"</span>
                <span class="${styles.secondaryInfo}"><strong>Tipo:</strong> ${d.tipo}</span>
                <span class="${styles.secondaryInfo}"><strong>Ranhura:</strong> ${d.ranhura_mm}mm</span>
              `
              )
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY + 10}px`);
          })
          .on('mouseout', (event, d: any) => {
            tooltip
              .transition()
              .duration(200)
              .style('opacity', 0)
              .attr('display', 'hidden')
              .attr('visibility', 'hidden');
          });
      };

      const geologicData = perfil.geologico;
      const constructionData = perfil.construtivo;

      const maxValues = [
        geologicData.length === 0
          ? 0
          : geologicData[geologicData.length - 1].ate,
        constructionData.furo.length === 0
          ? 0
          : constructionData.furo[constructionData.furo.length - 1].ate,
        constructionData.espaco_anelar.length === 0
          ? 0
          : constructionData.espaco_anelar[
              constructionData.espaco_anelar.length - 1
            ].ate,
        constructionData.revestimento.length === 0
          ? 0
          : constructionData.revestimento[
              constructionData.revestimento.length - 1
            ].ate,
        constructionData.filtros.length === 0
          ? 0
          : constructionData.filtros[constructionData.filtros.length - 1].ate,
      ];

      yScale = d3
        .scaleLinear()
        .domain([0, d3.max(maxValues)])
        .range([0, HEIGHT]);

      if (geologicData) plotGeology(geologicData);
      if (constructionData) plotPoco(constructionData);
      const yAxesCall = d3.axisLeft(yScale).tickFormat((d: any) => `${d} m`);

      litoligicalGroup.append('g').attr('class', 'y-axis').call(yAxesCall);
    },

    /*
        useEffect has a dependency array (below). It's a list of dependency
        variables for this useEffect block. The block will run after mount
        and whenever any of these variables change. We still have to check
        if the variables are valid, but we do not have to compare old props
        to next props to decide whether to rerender.
    */
    [perfil, svgContainer.current]
  );

  let noPerfil = true;
  if (perfil.geologico && perfil.construtivo) {
    noPerfil =
      perfil.geologico.length === 0 &&
      perfil.construtivo.furo.length === 0 &&
      perfil.construtivo.espaco_anelar.length === 0 &&
      perfil.construtivo.revestimento.length === 0 &&
      perfil.construtivo.filtros.length === 0;
  }
  return (
    <>
      {noPerfil ? (
        <span className={styles.noFilesMsg}>Perfil não configurado</span>
      ) : (
        <svg className={`${styles.svgContainer}`} ref={svgContainer} />
      )}
    </>
  );
};

export default PerfilDrawer;
