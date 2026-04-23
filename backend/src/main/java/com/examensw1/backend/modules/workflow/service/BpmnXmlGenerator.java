package com.examensw1.backend.modules.workflow.service;

import com.examensw1.backend.modules.workflow.domain.Workflow;
import com.examensw1.backend.modules.workflow.domain.WorkflowEdge;
import com.examensw1.backend.modules.workflow.domain.WorkflowNode;
import com.examensw1.backend.shared.enums.NodeType;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Genera BPMN 2.0 XML ejecutable a partir del modelo node/edge almacenado en MongoDB.
 * Se usa cuando el template no tiene bpmnXml guardado (compat. con templates anteriores)
 * o como respaldo si el XML del diseñador es inválido.
 */
@Component
public class BpmnXmlGenerator {

    public String generate(Workflow workflow) {
        String processKey = sanitizeKey(workflow.getId());

        // Mapas de incoming/outgoing por nodo
        Map<String, List<String>> incoming = new HashMap<>();
        Map<String, List<String>> outgoing = new HashMap<>();
        for (WorkflowNode n : workflow.getNodos()) {
            incoming.put(n.getId(), new ArrayList<>());
            outgoing.put(n.getId(), new ArrayList<>());
        }
        for (WorkflowEdge e : workflow.getConexiones()) {
            outgoing.computeIfAbsent(e.getNodoOrigenId(), k -> new ArrayList<>()).add(e.getId());
            incoming.computeIfAbsent(e.getNodoDestinoId(), k -> new ArrayList<>()).add(e.getId());
        }

        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<definitions xmlns=\"http://www.omg.org/spec/BPMN/20100524/MODEL\"\n");
        sb.append("             xmlns:camunda=\"http://camunda.org/schema/1.0/bpmn\"\n");
        sb.append("             xmlns:bpmndi=\"http://www.omg.org/spec/BPMN/20100524/DI\"\n");
        sb.append("             xmlns:dc=\"http://www.omg.org/spec/DD/20100524/DC\"\n");
        sb.append("             xmlns:di=\"http://www.omg.org/spec/DD/20100524/DI\"\n");
        sb.append("             targetNamespace=\"http://examensw1/workflow\">\n\n");

        sb.append("  <process id=\"").append(processKey)
          .append("\" name=\"").append(escape(workflow.getNombre()))
          .append("\" isExecutable=\"true\">\n\n");

        // Elementos del proceso
        for (WorkflowNode node : workflow.getNodos()) {
            List<String> inc = incoming.getOrDefault(node.getId(), List.of());
            List<String> out = outgoing.getOrDefault(node.getId(), List.of());
            sb.append(buildElement(node, inc, out));
        }

        // Sequence flows
        for (WorkflowEdge edge : workflow.getConexiones()) {
            sb.append(buildSequenceFlow(edge));
        }

        sb.append("  </process>\n\n");

        // DI (posiciones simples en línea horizontal)
        sb.append("  <bpmndi:BPMNDiagram id=\"diagram_1\">\n");
        sb.append("    <bpmndi:BPMNPlane bpmnElement=\"").append(processKey).append("\">\n");

        int x = 100;
        for (WorkflowNode node : workflow.getNodos()) {
            int w = (node.getTipo() == NodeType.INICIO || node.getTipo() == NodeType.FIN) ? 36 : 100;
            int h = (node.getTipo() == NodeType.INICIO || node.getTipo() == NodeType.FIN) ? 36 :
                    (node.getTipo() == NodeType.DECISION || node.getTipo() == NodeType.PARALELO) ? 50 : 80;
            sb.append("      <bpmndi:BPMNShape bpmnElement=\"").append(node.getId()).append("\">\n");
            sb.append("        <dc:Bounds x=\"").append(x).append("\" y=\"200\" width=\"")
              .append(w).append("\" height=\"").append(h).append("\"/>\n");
            sb.append("      </bpmndi:BPMNShape>\n");
            x += 160;
        }

        for (WorkflowEdge edge : workflow.getConexiones()) {
            sb.append("      <bpmndi:BPMNEdge bpmnElement=\"").append(edge.getId()).append("\">\n");
            sb.append("        <di:waypoint x=\"100\" y=\"218\"/>\n");
            sb.append("        <di:waypoint x=\"260\" y=\"218\"/>\n");
            sb.append("      </bpmndi:BPMNEdge>\n");
        }

        sb.append("    </bpmndi:BPMNPlane>\n");
        sb.append("  </bpmndi:BPMNDiagram>\n");
        sb.append("</definitions>\n");

        return sb.toString();
    }

    private String buildElement(WorkflowNode node, List<String> inc, List<String> out) {
        String id = node.getId();
        String name = escape(node.getNombre());
        StringBuilder sb = new StringBuilder();

        switch (node.getTipo()) {
            case INICIO -> {
                sb.append("    <startEvent id=\"").append(id).append("\" name=\"").append(name).append("\">\n");
                for (String o : out) sb.append("      <outgoing>").append(o).append("</outgoing>\n");
                sb.append("    </startEvent>\n\n");
            }
            case FIN -> {
                sb.append("    <endEvent id=\"").append(id).append("\" name=\"").append(name).append("\">\n");
                for (String i : inc) sb.append("      <incoming>").append(i).append("</incoming>\n");
                sb.append("    </endEvent>\n\n");
            }
            case TAREA -> {
                sb.append("    <userTask id=\"").append(id).append("\" name=\"").append(name).append("\"");
                if (node.getDepartamentoId() != null && !node.getDepartamentoId().isBlank()) {
                    sb.append(" camunda:candidateGroups=\"").append(node.getDepartamentoId()).append("\"");
                }
                sb.append(">\n");
                for (String i : inc) sb.append("      <incoming>").append(i).append("</incoming>\n");
                for (String o : out) sb.append("      <outgoing>").append(o).append("</outgoing>\n");
                sb.append("    </userTask>\n\n");
            }
            case DECISION -> {
                sb.append("    <exclusiveGateway id=\"").append(id).append("\" name=\"").append(name).append("\">\n");
                for (String i : inc) sb.append("      <incoming>").append(i).append("</incoming>\n");
                for (String o : out) sb.append("      <outgoing>").append(o).append("</outgoing>\n");
                sb.append("    </exclusiveGateway>\n\n");
            }
            case PARALELO -> {
                sb.append("    <parallelGateway id=\"").append(id).append("\" name=\"").append(name).append("\">\n");
                for (String i : inc) sb.append("      <incoming>").append(i).append("</incoming>\n");
                for (String o : out) sb.append("      <outgoing>").append(o).append("</outgoing>\n");
                sb.append("    </parallelGateway>\n\n");
            }
        }
        return sb.toString();
    }

    private String buildSequenceFlow(WorkflowEdge edge) {
        StringBuilder sb = new StringBuilder();
        sb.append("    <sequenceFlow id=\"").append(edge.getId())
          .append("\" sourceRef=\"").append(edge.getNodoOrigenId())
          .append("\" targetRef=\"").append(edge.getNodoDestinoId()).append("\"");

        if (edge.getCondicion() != null && !edge.getCondicion().isBlank()) {
            sb.append(">\n");
            sb.append("      <conditionExpression>${condicion == '")
              .append(escape(edge.getCondicion())).append("'}</conditionExpression>\n");
            sb.append("    </sequenceFlow>\n\n");
        } else {
            sb.append("/>\n\n");
        }
        return sb.toString();
    }

    /** Camunda process keys must be alphanumeric + underscore */
    public String sanitizeKey(String id) {
        return "proc_" + id.replaceAll("[^a-zA-Z0-9_]", "_");
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
